import os
import requests
import numpy as np
import pandas as pd
from datetime import datetime

def safe_float(val) -> float:
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        try:
            return float(val)
        except ValueError:
            return 0.0
    if isinstance(val, dict):
        if 'value' in val:
            return safe_float(val['value'])
        if 'd' in val and isinstance(val['d'], list) and len(val['d']) > 0:
            try:
                digits_str = "".join(str(x) for x in val['d'])
                exp = val.get('e', len(digits_str) - 1)
                val_num = float(digits_str) * (10 ** (exp - len(digits_str) + 1))
                return -val_num if val.get('s') == -1 else val_num
            except Exception:
                pass
        for k in ('amount', 'total', 'val', 'number', 'num'):
            if k in val:
                return safe_float(val[k])
        return 0.0
    return 0.0

def get_local_data(table: str, limit: int = 1000, order_by: str = None):
    api_url = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:3001")
    url = f"{api_url}/zestfoot/admin/query"

    orderBy = None
    if order_by:
        parts = order_by.split('.')
        column = parts[0]
        ascending = True
        if len(parts) > 1 and parts[1].lower() == 'desc':
            ascending = False
        orderBy = [{"column": column, "ascending": ascending}]

    payload = {
        "table": table,
        "limit": limit
    }
    if orderBy:
        payload["orderBy"] = orderBy

    headers = {
        "Content-Type": "application/json"
    }
    try:
        res = requests.post(url, json=payload, headers=headers)
        if res.status_code not in (200, 201):
            raise RuntimeError(f"Failed to fetch {table} from NestJS: {res.text}")
        return res.json().get("data", [])
    except Exception as e:
        raise RuntimeError(f"Connection failed to NestJS at {url}: {e}")

def get_recommendations(user_email: str, limit=5):
    try:
        orders_data = get_local_data("orders", limit=1000, order_by="created_at.desc")
        reviews_data = get_local_data("reviews", limit=1000, order_by="created_at.desc")
        products_data = get_local_data("products", limit=1000)
    except Exception as e:
        print(f"[ML Recommendation] Local DB fetch error: {e}")
        return []

    product_map = {p['id']: p for p in products_data}

    interactions = []

    for o in orders_data:
        if o.get('status') == 'cancelled':
            continue
        customer = o.get('customer')
        email = None
        if isinstance(customer, dict):
            email = customer.get('email')
        if not email:
            email = o.get('email') or o.get('customer_email')
        if not email:
            continue
        items = o.get('items', [])
        for item in items:
            pid = item.get('product_id')
            if pid:
                interactions.append({'email': email, 'product_id': int(pid), 'score': 5})

    for r in reviews_data:
        email = r.get('email')
        pid = r.get('product_id')
        rating = r.get('rating')
        if email and pid and rating:
            interactions.append({'email': email, 'product_id': int(pid), 'score': int(rating)})

    if not interactions:
        return products_data[:limit]

    df = pd.DataFrame(interactions)
    df = df.groupby(['email', 'product_id'])['score'].max().reset_index()

    pivot = df.pivot_table(index='email', columns='product_id', values='score', fill_value=0)

    if user_email not in pivot.index:
        top_pids = df.groupby('product_id')['score'].sum().sort_values(ascending=False).index.tolist()
        rec_products = [product_map[pid] for pid in top_pids if pid in product_map][:limit]
        if len(rec_products) < limit:
            remaining = [p for p in products_data if p['id'] not in [rp['id'] for rp in rec_products]]
            rec_products.extend(remaining[:limit - len(rec_products)])
        return rec_products

    try:
        from sklearn.metrics.pairwise import cosine_similarity
        prod_similarity = cosine_similarity(pivot.T)
        df_sim = pd.DataFrame(prod_similarity, index=pivot.columns, columns=pivot.columns)
    except Exception as sim_err:
        print(f"[ML Recommendation] Cosine similarity failed, using popularity fallback: {sim_err}")
        top_pids = df.groupby('product_id')['score'].sum().sort_values(ascending=False).index.tolist()
        return [product_map[pid] for pid in top_pids if pid in product_map][:limit]

    user_vector = pivot.loc[user_email]
    unrated_products = user_vector[user_vector == 0].index
    rated_products = user_vector[user_vector > 0].index

    if len(rated_products) == 0:
        top_pids = df.groupby('product_id')['score'].sum().sort_values(ascending=False).index.tolist()
        return [product_map[pid] for pid in top_pids if pid in product_map][:limit]

    predicted_scores = {}
    for pid in unrated_products:
        sim_scores = df_sim[pid]
        numerator = sum(sim_scores[r_pid] * user_vector[r_pid] for r_pid in rated_products)
        denominator = sum(abs(sim_scores[r_pid]) for r_pid in rated_products)
        predicted_scores[pid] = numerator / (denominator + 1e-9)

    sorted_pids = sorted(predicted_scores.items(), key=lambda x: x[1], reverse=True)
    recommended_pids = [pid for pid, score in sorted_pids][:limit]

    rec_products = [product_map[pid] for pid in recommended_pids if pid in product_map]

    if len(rec_products) < limit:
        top_pids = df.groupby('product_id')['score'].sum().sort_values(ascending=False).index.tolist()
        for pid in top_pids:
            if len(rec_products) >= limit:
                break
            if pid in product_map and product_map[pid] not in rec_products:
                rec_products.append(product_map[pid])

    return rec_products


def get_demand_forecasting():
    try:
        orders_data = get_local_data("orders", limit=1000, order_by="created_at.desc")
        products_data = get_local_data("products", limit=1000)
    except Exception as e:
        print(f"[ML Forecasting] Local DB fetch error: {e}")
        return []

    product_brand_map = {p['id']: p.get('brand') or 'Other' for p in products_data}

    history = {}
    all_months = set()
    all_brands = set(product_brand_map.values())

    for o in orders_data:
        if o.get('status') == 'cancelled':
            continue
        created_at = o.get('created_at')
        if not created_at or len(created_at) < 7:
            continue
        date_str = created_at[:7]
        all_months.add(date_str)
        items = o.get('items', [])
        for item in items:
            pid = item.get('product_id')
            brand = product_brand_map.get(pid, 'Other')
            qty = int(item.get('quantity') or 1)
            key = (brand, date_str)
            history[key] = history.get(key, 0) + qty

    if not all_months:
        return []

    sorted_months = sorted(list(all_months))
    month_indices = {m: i for i, m in enumerate(sorted_months)}

    seasonal_factors = {
        1: 1.25, 2: 1.15, 3: 0.95, 4: 0.95, 5: 1.0, 6: 1.05,
        7: 1.1, 8: 1.05, 9: 1.3, 10: 1.15, 11: 1.5, 12: 1.4
    }

    now = datetime.now()
    forecasts = []

    try:
        from sklearn.linear_model import LinearRegression
    except Exception as e:
        print(f"[ML Forecasting] sklearn import error, using moving average fallback: {e}")
        for brand in all_brands:
            brand_sales = [history.get((brand, m), 0) for m in sorted_months]
            avg_sales = sum(brand_sales) / len(brand_sales) if brand_sales else 0
            forecasts.append({
                'brand': brand,
                'current_avg': int(round(avg_sales)),
                'forecast_1m': int(round(avg_sales * 1.1)),
                'forecast_3m': int(round(avg_sales * 1.2)),
                'forecast_6m': int(round(avg_sales * 1.05))
            })
        return forecasts

    for brand in all_brands:
        X = []
        y = []
        for m in sorted_months:
            X.append([month_indices[m]])
            y.append(history.get((brand, m), 0))

        if not y or sum(y) == 0:
            forecasts.append({
                'brand': brand,
                'current_avg': 0,
                'forecast_1m': 0,
                'forecast_3m': 0,
                'forecast_6m': 0
            })
            continue

        model = LinearRegression()
        model.fit(X, y)
        last_idx = len(sorted_months) - 1

        def get_forecast(offset):
            pred_idx = last_idx + offset
            pred_raw = model.predict([[pred_idx]])[0]
            pred_raw = max(0.0, pred_raw)

            f_month = (now.month + offset - 1) % 12 + 1
            factor = seasonal_factors.get(f_month, 1.0)
            return int(round(pred_raw * factor))

        forecasts.append({
            'brand': brand,
            'current_avg': int(round(sum(y) / len(y))),
            'forecast_1m': get_forecast(1),
            'forecast_3m': get_forecast(3),
            'forecast_6m': get_forecast(6)
        })

    forecasts.sort(key=lambda x: x['forecast_1m'], reverse=True)
    return forecasts


def get_customer_ml_scores():
    try:
        orders_data = get_local_data("orders", limit=1000, order_by="created_at.desc")
        engagement_data = get_local_data("point_transactions", limit=1000, order_by="created_at.desc")
    except Exception as e:
        print(f"[ML Scoring] Local DB fetch error: {e}")
        return []

    now = datetime.now()
    users = {}

    for o in orders_data:
        if o.get('status') == 'cancelled':
            continue

        customer = o.get('customer')
        email = None
        name = 'Khách vãng lai'
        if isinstance(customer, dict):
            email = customer.get('email')
            name = customer.get('fullName') or 'Khách vãng lai'
        elif isinstance(customer, str):
            name = customer

        if not email:
            email = o.get('email') or o.get('customer_email')
        if not email:
            continue

        try:
            o_date = datetime.fromisoformat(o.get('created_at').replace('Z', '+00:00'))
            o_date = o_date.replace(tzinfo=None)
        except Exception:
            o_date = now

        spent = safe_float(o.get('total_amount'))
        discount = safe_float(o.get('discount')) + safe_float(o.get('voucher_discount')) + safe_float(o.get('point_discount'))

        if email not in users:
            users[email] = {
                'email': email,
                'name': name,
                'order_dates': [],
                'total_spent': 0.0,
                'total_discount': 0.0,
                'last_order_date': o_date
            }

        users[email]['order_dates'].append(o_date)
        users[email]['total_spent'] += spent
        users[email]['total_discount'] += discount
        if o_date > users[email]['last_order_date']:
            users[email]['last_order_date'] = o_date

    results = []
    for email, u in users.items():
        recency_days = (now - u['last_order_date']).days
        frequency = len(u['order_dates'])
        monetary = u['total_spent']

        x_churn = (recency_days - 60) / 20.0 - (frequency * 0.15)
        churn_prob = 1.0 / (1.0 + np.exp(-x_churn))
        churn_pct = int(round(churn_prob * 100))

        discount_ratio = u['total_discount'] / (monetary + u['total_discount'] + 1e-9)
        x_prop = (discount_ratio - 0.12) * 8.0 + (frequency * 0.1)
        prop_prob = 1.0 / (1.0 + np.exp(-x_prop))
        prop_pct = int(round(prop_prob * 100))

        results.append({
            'email': email,
            'name': u['name'],
            'recency_days': recency_days,
            'frequency': frequency,
            'monetary': monetary,
            'churn_probability': churn_pct,
            'discount_propensity': prop_pct,
            'status': 'Nguy cơ cao' if churn_pct >= 70 else ('Trung bình' if churn_pct >= 35 else 'An toàn'),
            'action': 'Gửi Voucher Ngay' if prop_pct >= 55 else 'Không cần Voucher'
        })

    results.sort(key=lambda x: x['churn_probability'], reverse=True)
    return results
