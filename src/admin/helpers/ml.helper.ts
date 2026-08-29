import { serializeData } from '../../common/utils/db-serialization';

export function computeLocalDemandForecasting(orders: any[], products: any[]) {
  const productBrandMap: Record<string, string> = {};
  products.forEach((p) => {
    productBrandMap[p.id.toString()] = p.brand || 'Other';
  });

  const history: Record<string, number> = {};
  const allMonths = new Set<string>();
  const allBrands = new Set<string>(Object.values(productBrandMap));

  orders.forEach((o) => {
    if (o.status === 'cancelled') return;
    const createdAt = o.created_at ? new Date(o.created_at).toISOString() : '';
    if (createdAt.length < 7) return;
    const yearMonth = createdAt.substring(0, 7);
    allMonths.add(yearMonth);

    const items = (typeof o.items === 'string' ? JSON.parse(o.items) : o.items) || [];
    items.forEach((item: any) => {
      const pid = (item.product_id || item.id)?.toString();
      const brand = productBrandMap[pid] || 'Other';
      const qty = parseInt(item.quantity || 1, 10);
      const key = `${brand}_${yearMonth}`;
      history[key] = (history[key] || 0) + qty;
    });
  });

  if (allMonths.size === 0) return [];

  const sortedMonths = Array.from(allMonths).sort();
  const monthIndices: Record<string, number> = {};
  sortedMonths.forEach((m, idx) => {
    monthIndices[m] = idx;
  });

  const seasonalFactors: Record<number, number> = {
    1: 1.25, 2: 1.15, 3: 0.95, 4: 0.95, 5: 1.0, 6: 1.05,
    7: 1.1, 8: 1.05, 9: 1.3, 10: 1.15, 11: 1.5, 12: 1.4,
  };

  const now = new Date();
  const forecasts = [];

  for (const brand of allBrands) {
    const X: number[] = [];
    const Y: number[] = [];
    let sumY = 0;

    sortedMonths.forEach((m) => {
      const xVal = monthIndices[m];
      const yVal = history[`${brand}_${m}`] || 0;
      X.push(xVal);
      Y.push(yVal);
      sumY += yVal;
    });

    const currentAvg = sumY / Y.length;

    
    let slope = 0;
    let intercept = currentAvg;

    if (X.length > 1) {
      const n = X.length;
      let sumX = 0;
      let sumXY = 0;
      let sumXX = 0;
      for (let i = 0; i < n; i++) {
        sumX += X[i];
        sumXY += X[i] * Y[i];
        sumXX += X[i] * X[i];
      }
      const denominator = n * sumXX - sumX * sumX;
      if (denominator !== 0) {
        slope = (n * sumXY - sumX * sumY) / denominator;
        intercept = (sumY - slope * sumX) / n;
      }
    }

    const nextIndex = X.length;
    const projectQty = (monthOffset: number) => {
      const targetIndex = nextIndex + monthOffset - 1;
      const rawForecast = slope * targetIndex + intercept;
      const targetMonthObj = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const monthNumber = targetMonthObj.getMonth() + 1;
      const sFactor = seasonalFactors[monthNumber] || 1.0;
      return Math.max(0, Math.round(rawForecast * sFactor));
    };

    forecasts.push({
      brand,
      current_avg: Math.round(currentAvg * 10) / 10,
      forecast_1m: projectQty(1),
      forecast_3m: projectQty(3),
      forecast_6m: projectQty(6),
    });
  }

  return forecasts;
}

export function computeLocalCustomerMlScores(orders: any[]) {
  const now = new Date();
  const users: Record<string, any> = {};

  orders.forEach((o) => {
    if (o.status === 'cancelled') return;

    const customerObj = typeof o.customer === 'string' ? JSON.parse(o.customer) : o.customer;
    let email = customerObj?.email;
    let name = customerObj?.fullName || 'Khách vãng lai';

    if (!email) {
      email = o.voucher_code;
    }
    if (!email) return;

    email = email.toLowerCase().trim();
    let oDate = new Date(o.created_at);
    if (isNaN(oDate.getTime())) oDate = now;

    const spent = Number(o.total_amount) || 0;
    const discount = Number(o.discount || 0) + Number(o.voucher_discount || 0) + Number(o.point_discount || 0);

    if (!users[email]) {
      users[email] = { email, name, orderDates: [], totalSpent: 0.0, totalDiscount: 0.0, lastOrderDate: oDate };
    }

    users[email].orderDates.push(oDate);
    users[email].totalSpent += spent;
    users[email].totalDiscount += discount;
    if (oDate > users[email].lastOrderDate) {
      users[email].lastOrderDate = oDate;
    }
  });

  const results = Object.keys(users).map((email) => {
    const u = users[email];
    const recencyDays = Math.max(0, Math.floor((now.getTime() - u.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)));
    const frequency = u.orderDates.length;
    const monetary = u.totalSpent;

    const xChurn = (recencyDays - 60) / 20.0 - frequency * 0.15;
    const churnProb = 1.0 / (1.0 + Math.exp(-xChurn));
    const churnPct = Math.round(churnProb * 100);

    const discountRatio = u.totalDiscount / (monetary + u.totalDiscount + 1e-9);
    const xProp = (discountRatio - 0.12) * 8.0 + frequency * 0.1;
    const propProb = 1.0 / (1.0 + Math.exp(-xProp));
    const propPct = Math.round(propProb * 100);

    return {
      email,
      name: u.name,
      recency_days: recencyDays,
      frequency,
      monetary,
      churn_probability: churnPct,
      discount_propensity: propPct,
      status: churnPct >= 70 ? 'Nguy cơ cao' : churnPct >= 35 ? 'Trung bình' : 'An toàn',
      action: propPct >= 55 ? 'Gửi Voucher Ngay' : 'Không cần Voucher',
    };
  });

  results.sort((a, b) => b.churn_probability - a.churn_probability);
  return results;
}

export function computeLocalRecommendations(orders: any[], reviews: any[], products: any[], userEmail: string, limit = 5) {
  const productMap: Record<number, any> = {};
  products.forEach((p) => {
    productMap[Number(p.id)] = p;
  });

  const interactions: Record<string, Record<number, number>> = {};
  orders.forEach((o) => {
    if (o.status === 'cancelled') return;
    const customerObj = typeof o.customer === 'string' ? JSON.parse(o.customer) : o.customer;
    let email = customerObj?.email;
    if (!email) return;

    email = email.toLowerCase().trim();
    const items = (typeof o.items === 'string' ? JSON.parse(o.items) : o.items) || [];
    items.forEach((item: any) => {
      const pid = item.product_id || item.id;
      if (pid) {
        const pidNum = parseInt(pid, 10);
        if (!interactions[email]) interactions[email] = {};
        interactions[email][pidNum] = Math.max(interactions[email][pidNum] || 0, 5);
      }
    });
  });

  reviews.forEach((r) => {
    let email = r.email;
    const pid = r.product_id;
    const rating = r.rating;
    if (email && pid && rating) {
      email = email.toLowerCase().trim();
      const pidNum = Number(pid);
      if (!interactions[email]) interactions[email] = {};
      interactions[email][pidNum] = Math.max(interactions[email][pidNum] || 0, rating);
    }
  });

  const getPopularRecommendations = () => {
    const productScores: Record<number, number> = {};
    Object.keys(interactions).forEach((email) => {
      Object.keys(interactions[email]).forEach((pidStr) => {
        const pid = Number(pidStr);
        productScores[pid] = (productScores[pid] || 0) + interactions[email][pid];
      });
    });

    const sortedPids = Object.keys(productScores)
      .map(Number)
      .sort((a, b) => productScores[b] - productScores[a]);

    const recs = sortedPids
      .map((pid) => serializeData(productMap[pid]))
      .filter(Boolean)
      .slice(0, limit);

    if (recs.length < limit) {
      products.forEach((p) => {
        if (recs.length >= limit) return;
        if (!recs.find((rp) => Number(rp.id) === Number(p.id))) {
          recs.push(serializeData(p));
        }
      });
    }
    return recs;
  };

  const targetEmail = userEmail ? userEmail.toLowerCase().trim() : '';
  if (!targetEmail || !interactions[targetEmail]) {
    return getPopularRecommendations();
  }

  const emails = Object.keys(interactions);
  const targetRatings = interactions[targetEmail];

  const userSimilarities: { email: string; similarity: number }[] = [];
  const dotProduct = (v1: Record<number, number>, v2: Record<number, number>) => {
    let sum = 0;
    for (const [k, val] of Object.entries(v1)) {
      const numKey = Number(k);
      if (v2[numKey] !== undefined) {
        sum += val * v2[numKey];
      }
    }
    return sum;
  };

  const norm = (v: Record<number, number>) => {
    let sum = 0;
    for (const val of Object.values(v)) {
      sum += val * val;
    }
    return Math.sqrt(sum);
  };

  const normTarget = norm(targetRatings);

  emails.forEach((otherEmail) => {
    if (otherEmail === targetEmail) return;
    const otherRatings = interactions[otherEmail];
    const numerator = dotProduct(targetRatings, otherRatings);
    const denominator = normTarget * norm(otherRatings);
    const sim = denominator === 0 ? 0 : numerator / denominator;
    if (sim > 0) {
      userSimilarities.push({ email: otherEmail, similarity: sim });
    }
  });

  userSimilarities.sort((a, b) => b.similarity - a.similarity);

  const ratedProducts = Object.keys(targetRatings).map(Number);
  const unratedProducts: number[] = [];
  Object.keys(productMap).forEach((pidStr) => {
    const pid = Number(pidStr);
    if (!ratedProducts.includes(pid)) {
      unratedProducts.push(pid);
    }
  });

  const similarities: Record<number, Record<number, number>> = {};
  const getProductVector = (pid: number) => {
    const vector: Record<number, number> = {};
    emails.forEach((email, idx) => {
      if (interactions[email][pid] !== undefined) {
        vector[idx] = interactions[email][pid];
      }
    });
    return vector;
  };

  const dotProductVectors = (v1: Record<number, number>, v2: Record<number, number>) => {
    let sum = 0;
    for (const [k, val] of Object.entries(v1)) {
      const idx = Number(k);
      if (v2[idx] !== undefined) {
        sum += val * v2[idx];
      }
    }
    return sum;
  };

  const normVector = (v: Record<number, number>) => {
    let sum = 0;
    for (const val of Object.values(v)) {
      sum += val * val;
    }
    return Math.sqrt(sum);
  };

  unratedProducts.forEach((uPid) => {
    similarities[uPid] = {};
    const vU = getProductVector(uPid);
    const normU = normVector(vU);

    ratedProducts.forEach((rPid) => {
      const vR = getProductVector(rPid);
      const normR = normVector(vR);
      const denominator = normU * normR;
      const sim = denominator === 0 ? 0 : dotProductVectors(vU, vR) / denominator;
      similarities[uPid][rPid] = sim;
    });
  });

  const predictedScores: { id: number; score: number }[] = [];
  unratedProducts.forEach((uPid) => {
    let numerator = 0;
    let denominator = 0;
    ratedProducts.forEach((rPid) => {
      const sim = similarities[uPid][rPid] || 0;
      numerator += sim * (interactions[targetEmail][rPid] || 0);
      denominator += Math.abs(sim);
    });
    const score = denominator === 0 ? 0 : numerator / (denominator + 1e-9);
    predictedScores.push({ id: uPid, score });
  });

  predictedScores.sort((a, b) => b.score - a.score);
  const recProducts = predictedScores
    .map((ps) => serializeData(productMap[ps.id]))
    .filter(Boolean)
    .slice(0, limit);

  if (recProducts.length < limit) {
    const populars = getPopularRecommendations();
    populars.forEach((p) => {
      if (recProducts.length >= limit) return;
      if (!recProducts.find((rp) => Number(rp.id) === Number(p.id))) {
        recProducts.push(p);
      }
    });
  }

  return recProducts;
}
