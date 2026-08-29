export function computeAnalytics(sales: any[], engagement: any[], products: any[], vouchers: any[], reviews: any[], brandFilter = 'all') {
  const productBrandMap: Record<string, string> = {};
  products.forEach((p: any) => {
    productBrandMap[p.product_id] = p.brand;
  });

  const salesWithBrands = sales.map((s: any) => ({
    ...s,
    brand: s.brand || productBrandMap[s.product_id] || 'Other',
  }));

  const filteredSales = brandFilter === 'all' 
    ? salesWithBrands 
    : salesWithBrands.filter((s: any) => s.brand?.toLowerCase() === brandFilter.toLowerCase());

  const deliveredOrders: any[] = [];
  const orderMap: Record<string, any> = {};
  
  filteredSales.forEach((item: any) => {
    if (item.order_status === 'delivered') {
      if (!orderMap[item.order_id]) {
        orderMap[item.order_id] = {
          order_id: item.order_id,
          total_amount: Number(item.order_total_amount) || 0,
          discount: Number(item.order_coupon_discount) || 0,
          voucher_discount: Number(item.order_voucher_discount) || 0,
          point_discount: Number(item.order_point_discount) || 0,
          shipping_fee: Number(item.order_shipping_fee) || 0,
          date: item.order_date,
          user_id: item.user_id,
          customer_email: item.customer_email,
        };
        deliveredOrders.push(orderMap[item.order_id]);
      }
    }
  });

  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalOrdersCount = deliveredOrders.length;
  const aov = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
  
  const totalVoucherDiscountUsed = deliveredOrders.reduce((sum, o) => sum + o.voucher_discount, 0);
  const totalPointDiscountUsed = deliveredOrders.reduce((sum, o) => sum + o.point_discount, 0);
  const totalCouponDiscountUsed = deliveredOrders.reduce((sum, o) => sum + o.discount, 0);

  const games: Record<string, any> = {
    luckyWheel: { name: 'Vòng Quay May Mắn (Lucky Wheel)', prefix: 'WHEEL-', issued: 0, used: 0, revenue: 0, cost: 0 },
    snake: { name: 'Rắn Săn Mồi (Snake Game)', prefix: 'SNAKE', issued: 0, used: 0, revenue: 0, cost: 0 },
    tetris: { name: 'Xếp Gạch (Tetris Game)', prefix: 'TETRIS', issued: 0, used: 0, revenue: 0, cost: 0 },
    shoeMatch: { name: 'Ghép Giày (Shoe Match)', prefix: 'MATCH', issued: 0, used: 0, revenue: 0, cost: 0 },
  };

  vouchers.forEach((v: any) => {
    const code = v.code || '';
    let gameKey: string | null = null;
    if (code.startsWith('WHEEL-')) gameKey = 'luckyWheel';
    else if (code.startsWith('SNAKE')) gameKey = 'snake';
    else if (code.startsWith('TETRIS')) gameKey = 'tetris';
    else if (code.startsWith('MATCH')) gameKey = 'shoeMatch';

    if (gameKey) {
      games[gameKey].issued++;
      if (v.status === 'used') {
        games[gameKey].used++;
      }
    }
  });

  deliveredOrders.forEach((o) => {
    if (o.voucher_discount > 0 && o.voucher_code) {
      const code = o.voucher_code;
      let gameKey: string | null = null;
      if (code.startsWith('WHEEL-')) gameKey = 'luckyWheel';
      else if (code.startsWith('SNAKE')) gameKey = 'snake';
      else if (code.startsWith('TETRIS')) gameKey = 'tetris';
      else if (code.startsWith('MATCH')) gameKey = 'shoeMatch';

      if (gameKey) {
        games[gameKey].revenue += o.total_amount;
        games[gameKey].cost += o.voucher_discount;
      }
    }
  });

  const gamificationROI = Object.keys(games).map((key) => {
    const g = games[key];
    const profit = g.revenue - g.cost;
    const roi = g.cost > 0 ? (profit / g.cost) * 100 : 0;
    const conversionRate = g.issued > 0 ? (g.used / g.issued) * 100 : 0;
    
    return {
      gameKey: key,
      name: g.name,
      issued: g.issued,
      used: g.used,
      conversionRate: Math.round(conversionRate * 10) / 10,
      revenueDriven: g.revenue,
      cost: g.cost,
      netRevenue: profit,
      roi: Math.round(roi),
    };
  });

  const pointEarnEvents = engagement.filter((e: any) => e.event_type === 'point_earn');
  const pointSpendEvents = engagement.filter((e: any) => e.event_type === 'point_spend');

  const totalPointsEarned = pointEarnEvents.reduce((sum, e: any) => sum + (e.point_value || 0), 0);
  const totalPointsSpent = Math.abs(pointSpendEvents.reduce((sum, e: any) => sum + (e.point_value || 0), 0));

  const pointsBySource = {
    luckyWheel: 0,
    dailyCheckIn: 0,
    orders: 0,
    other: 0,
  };

  pointEarnEvents.forEach((e: any) => {
    const reason = e.reason || '';
    const amount = e.point_value || 0;
    if (reason.includes('Lucky Wheel')) pointsBySource.luckyWheel += amount;
    else if (reason.includes('Điểm danh') || reason.includes('Check-in')) pointsBySource.dailyCheckIn += amount;
    else if (reason.includes('Tích điểm đơn hàng') || reason.includes('đơn hàng')) pointsBySource.orders += amount;
    else pointsBySource.other += amount;
  });

  
  const customerOrders: Record<string, any[]> = {};
  
  salesWithBrands.forEach((item: any) => {
    if (item.order_status === 'delivered') {
      const customerId = item.user_id || item.customer_email || 'anonymous';
      if (customerId === 'anonymous') return;

      if (!customerOrders[customerId]) {
        customerOrders[customerId] = [];
      }

      const existingOrder = customerOrders[customerId].find((o) => o.order_id === item.order_id);
      if (!existingOrder) {
        customerOrders[customerId].push({
          order_id: item.order_id,
          date: new Date(item.order_date),
          brands: new Set([item.brand]),
        });
      } else {
        existingOrder.brands.add(item.brand);
      }
    }
  });

  const customerCohorts: Record<string, any> = {};
  Object.keys(customerOrders).forEach((customerId) => {
    const orders = customerOrders[customerId].sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
    const firstOrder = orders[0];
    const cohortMonth = firstOrder.date.toISOString().substring(0, 7); 
    
    customerCohorts[customerId] = {
      cohortMonth,
      firstOrderDate: firstOrder.date,
      orders: orders,
    };
  });

  const cohortGroups: Record<string, any> = {};
  const MAX_MONTHS = 6;

  Object.keys(customerCohorts).forEach((customerId) => {
    const c = customerCohorts[customerId];
    const cohortMonth = c.cohortMonth;

    if (!cohortGroups[cohortMonth]) {
      cohortGroups[cohortMonth] = {
        cohortMonth,
        size: 0,
        activeCounts: Array(MAX_MONTHS).fill(0),
        activeUsers: Array(MAX_MONTHS).fill(null).map(() => new Set()),
      };
    }

    cohortGroups[cohortMonth].size++;

    c.orders.forEach((order: any) => {
      const orderMonthStr = order.date.toISOString().substring(0, 7);
      const [cYear, cMonth] = cohortMonth.split('-').map(Number);
      const [oYear, oMonth] = orderMonthStr.split('-').map(Number);
      
      const diffMonths = (oYear - cYear) * 12 + (oMonth - cMonth);

      let isBrandMatch = true;
      if (brandFilter !== 'all') {
        isBrandMatch = order.brands.has(brandFilter);
      }

      if (diffMonths >= 0 && diffMonths < MAX_MONTHS && isBrandMatch) {
        cohortGroups[cohortMonth].activeUsers[diffMonths].add(customerId);
      }
    });
  });

  const cohortsData = Object.keys(cohortGroups)
    .sort((a, b) => a.localeCompare(b))
    .map((month) => {
      const group = cohortGroups[month];
      const retentionRates = group.activeUsers.map((usersSet: Set<string>, idx: number) => {
        const count = usersSet.size;
        const rate = group.size > 0 ? (count / group.size) * 100 : 0;
        return {
          monthIndex: idx,
          activeCount: count,
          rate: Math.round(rate * 10) / 10,
        };
      });

      return {
        cohortMonth: month,
        size: group.size,
        retention: retentionRates,
      };
    });

  
  const revenueByBrand: Record<string, number> = {};
  salesWithBrands.forEach((s: any) => {
    if (s.order_status === 'delivered') {
      const brand = s.brand || 'Other';
      const revenue = Number(s.gross_revenue) || 0;
      revenueByBrand[brand] = (revenueByBrand[brand] || 0) + revenue;
    }
  });

  const brandSalesData = Object.keys(revenueByBrand).map((brand) => ({
    brand,
    revenue: revenueByBrand[brand],
  })).sort((a, b) => b.revenue - a.revenue);

  const availableBrands = Array.from(new Set(salesWithBrands.map((s: any) => s.brand).filter(Boolean)));

  
  const monthlyRevenue: Record<string, any> = {};
  deliveredOrders.forEach((o) => {
    const month = o.date ? o.date.substring(0, 7) : 'Unknown';
    if (month !== 'Unknown') {
      if (!monthlyRevenue[month]) {
        monthlyRevenue[month] = { month, revenue: 0, orders: 0 };
      }
      monthlyRevenue[month].revenue += o.total_amount;
      monthlyRevenue[month].orders += 1;
    }
  });
  const monthlySalesTrend = Object.values(monthlyRevenue).sort((a: any, b: any) => a.month.localeCompare(b.month));

  const customerSpending: Record<string, any> = {};
  deliveredOrders.forEach((o) => {
    const email = o.customer_email || 'guest@zestfoot.com';
    if (!customerSpending[email]) {
      customerSpending[email] = { email, totalSpent: 0, orderCount: 0 };
    }
    customerSpending[email].totalSpent += o.total_amount;
    customerSpending[email].orderCount += 1;
  });
  const topSpendingUsers = Object.values(customerSpending)
    .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  const brandRatings: Record<string, any> = {};
  reviews.forEach((r: any) => {
    const brand = productBrandMap[r.product_id?.toString()] || 'Other';
    if (!brandRatings[brand]) {
      brandRatings[brand] = { brand, totalRating: 0, count: 0 };
    }
    brandRatings[brand].totalRating += Number(r.rating) || 5;
    brandRatings[brand].count += 1;
  });
  const brandSatisfaction = Object.keys(brandRatings).map((brand) => ({
    brand,
    avgRating: brandRatings[brand].count > 0 
      ? Number((brandRatings[brand].totalRating / brandRatings[brand].count).toFixed(1)) 
      : 0,
    count: brandRatings[brand].count,
  })).sort((a: any, b: any) => b.avgRating - a.avgRating);

  const uniqueOrdersMap: Record<string, string> = {};
  filteredSales.forEach((item: any) => {
    if (item.order_id && !uniqueOrdersMap[item.order_id]) {
      uniqueOrdersMap[item.order_id] = item.order_status || 'pending';
    }
  });
  const statusDistribution: Record<string, number> = {};
  Object.values(uniqueOrdersMap).forEach((status) => {
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  });
  const orderStatusLabelsMap: Record<string, string> = {
    pending: 'Chờ xử lý',
    processing: 'Đang xử lý',
    shipped: 'Đang giao',
    delivered: 'Đã giao',
    cancelled: 'Đã hủy',
  };
  const orderStatusData = Object.keys(statusDistribution).map((status) => ({
    status: orderStatusLabelsMap[status] || status,
    count: statusDistribution[status],
  }));

  const hourlyOrders = Array(24).fill(0).map((_, i) => ({ hour: `${i}h`, count: 0 }));
  deliveredOrders.forEach((o) => {
    if (o.date) {
      try {
        const d = new Date(o.date);
        const hour = d.getHours();
        if (hour >= 0 && hour < 24) {
          hourlyOrders[hour].count += 1;
        }
      } catch (e) {
        // ignore
      }
    }
  });
  const hourlyOrderVelocity = hourlyOrders;

  const sizeMap: Record<string, any> = {};
  filteredSales.forEach((s: any) => {
    if (s.order_status === 'delivered') {
      const sizeVal = s.size || 'N/A';
      if (!sizeMap[sizeVal]) sizeMap[sizeVal] = { size: sizeVal, quantity: 0, revenue: 0 };
      sizeMap[sizeVal].quantity += s.quantity || 1;
      sizeMap[sizeVal].revenue += Number(s.gross_revenue) || 0;
    }
  });
  const salesBySize = Object.values(sizeMap)
    .sort((a: any, b: any) => b.quantity - a.quantity)
    .slice(0, 8);

  const pmMap: Record<string, any> = {};
  const uniqueOrdersPM: Record<string, any> = {};
  filteredSales.forEach((s: any) => {
    if (s.order_status === 'delivered' && s.order_id) {
      if (!uniqueOrdersPM[s.order_id]) {
        uniqueOrdersPM[s.order_id] = {
          payment_method: s.payment_method || 'cod',
          total_amount: Number(s.order_total_amount) || 0,
        };
      }
    }
  });
  Object.values(uniqueOrdersPM).forEach((o: any) => {
    const pmVal = o.payment_method || 'cod';
    const pm = pmVal === 'cod' ? 'COD (Nhận hàng)' : (pmVal === 'vnpay' ? 'VNPay' : pmVal.toUpperCase());
    if (!pmMap[pm]) pmMap[pm] = { method: pm, count: 0, revenue: 0 };
    pmMap[pm].count += 1;
    pmMap[pm].revenue += o.total_amount;
  });
  const salesByPaymentMethod = Object.values(pmMap).sort((a: any, b: any) => b.revenue - a.revenue);

  const prodMap: Record<string, any> = {};
  filteredSales.forEach((s: any) => {
    if (s.order_status === 'delivered') {
      const name = s.product_name || 'Sản phẩm khác';
      if (!prodMap[name]) prodMap[name] = { name, quantity: 0, revenue: 0 };
      prodMap[name].quantity += s.quantity || 1;
      prodMap[name].revenue += Number(s.gross_revenue) || 0;
    }
  });
  const topSellingProducts = Object.values(prodMap)
    .sort((a: any, b: any) => b.quantity - a.quantity)
    .slice(0, 5);

  const ranges = [
    { range: 'Dưới 1.5M', min: 0, max: 1500000, count: 0, revenue: 0 },
    { range: '1.5M - 2.5M', min: 1500000, max: 2500000, count: 0, revenue: 0 },
    { range: 'Trên 2.5M', min: 2500000, max: Infinity, count: 0, revenue: 0 },
  ];
  filteredSales.forEach((s: any) => {
    if (s.order_status === 'delivered') {
      const price = Number(s.price) || 0;
      const gross = Number(s.gross_revenue) || 0;
      const rangeItem = ranges.find((r) => price >= r.min && price < r.max);
      if (rangeItem) {
        rangeItem.count += s.quantity || 1;
        rangeItem.revenue += gross;
      }
    }
  });
  const revenueByPriceRange = ranges.map((r) => ({
    range: r.range,
    count: r.count,
    revenue: r.revenue,
  }));

  return {
    success: true,
    stats: {
      totalRevenue,
      totalOrdersCount,
      aov,
      totalVoucherDiscountUsed,
      totalPointDiscountUsed,
      totalCouponDiscountUsed,
      totalPointsEarned,
      totalPointsSpent,
    },
    pointsBySource,
    gamificationROI,
    cohortsData,
    brandSalesData,
    availableBrands,
    extended: {
      monthlySalesTrend,
      topSpendingUsers,
      brandSatisfaction,
      orderStatusData,
      hourlyOrderVelocity,
      salesBySize,
      salesByPaymentMethod,
      topSellingProducts,
      revenueByPriceRange,
    },
  };
}
