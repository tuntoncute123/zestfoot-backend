export function computeMiningData(orders: any[], reviews: any[], products: any[]) {
  const completedOrders = orders.filter((o) => o.status === 'delivered');
  const totalOrdersCount = completedOrders.length;

  
  const productCounts: Record<number, number> = {};
  const pairCounts: Record<string, number> = {};
  const productDetailsMap: Record<number, any> = {};

  products.forEach((p) => {
    productDetailsMap[Number(p.id)] = {
      name: p.name,
      image: p.image,
      brand: p.brand,
    };
  });

  completedOrders.forEach((o) => {
    const items = (typeof o.items === 'string' ? JSON.parse(o.items) : o.items) || [];
    const uniqueIds = Array.from(new Set(items.map((item: any) => Number(item.product_id || item.id)).filter(Boolean))) as number[];

    uniqueIds.forEach((id) => {
      productCounts[id] = (productCounts[id] || 0) + 1;
    });

    for (let i = 0; i < uniqueIds.length; i++) {
      for (let j = i + 1; j < uniqueIds.length; j++) {
        const id1 = Math.min(uniqueIds[i], uniqueIds[j]);
        const id2 = Math.max(uniqueIds[i], uniqueIds[j]);
        const key = `${id1}-${id2}`;
        pairCounts[key] = (pairCounts[key] || 0) + 1;
      }
    }
  });

  const marketBasketRules = [];
  if (totalOrdersCount > 0) {
    for (const [key, countBoth] of Object.entries(pairCounts)) {
      const [id1, id2] = key.split('-').map(Number);
      const countA = productCounts[id1];
      const countB = productCounts[id2];

      const support = countBoth / totalOrdersCount;
      const confidenceAToB = countBoth / countA;
      const confidenceBToA = countBoth / countB;

      const supportA = countA / totalOrdersCount;
      const supportB = countB / totalOrdersCount;
      const lift = support / (supportA * supportB);

      let suggestion = '';
      if (lift > 1) {
        const nameA = productDetailsMap[id1]?.name || `Sản phẩm #${id1}`;
        const nameB = productDetailsMap[id2]?.name || `Sản phẩm #${id2}`;
        suggestion = `Tạo combo "${nameA} + ${nameB}" giảm giá 10% hoặc đặt chúng cạnh nhau trong danh mục gợi ý mua kèm tại trang Checkout.`;
      }

      marketBasketRules.push({
        id: key,
        productA: { id: id1, ...productDetailsMap[id1] },
        productB: { id: id2, ...productDetailsMap[id2] },
        countBoth,
        support: Math.round(support * 1000) / 10,
        confidenceAtoB: Math.round(confidenceAToB * 1000) / 10,
        confidenceBtoA: Math.round(confidenceBToA * 1000) / 10,
        lift: Math.round(lift * 100) / 100,
        suggestion,
      });
    }
  }
  marketBasketRules.sort((a, b) => b.lift - a.lift || b.countBoth - a.countBoth);

  
  const customerRFM: Record<string, any> = {};
  completedOrders.forEach((o) => {
    const customerObj = typeof o.customer === 'string' ? JSON.parse(o.customer) : o.customer;
    const email = customerObj?.email || 'anonymous';
    if (email === 'anonymous') return;

    const orderDate = new Date(o.created_at);
    const totalAmount = Number(o.total_amount) || 0;
    const name = customerObj?.fullName || 'Khách vãng lai';

    if (!customerRFM[email]) {
      customerRFM[email] = {
        email,
        name,
        lastOrderDate: orderDate,
        orderCount: 0,
        totalAmount: 0,
      };
    }
    customerRFM[email].orderCount++;
    customerRFM[email].totalAmount += totalAmount;
    if (orderDate > customerRFM[email].lastOrderDate) {
      customerRFM[email].lastOrderDate = orderDate;
    }
  });

  const now = new Date();
  const customersArray = Object.keys(customerRFM).map((email) => {
    const c = customerRFM[email];
    const recencyDays = Math.max(0, Math.floor((now.getTime() - c.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)));

    let rScore = 1;
    if (recencyDays < 15) rScore = 5;
    else if (recencyDays < 45) rScore = 4;
    else if (recencyDays < 90) rScore = 3;
    else if (recencyDays < 180) rScore = 2;

    let fScore = 1;
    if (c.orderCount >= 5) fScore = 5;
    else if (c.orderCount >= 3) fScore = 4;
    else if (c.orderCount === 2) fScore = 3;
    else if (c.orderCount === 1) fScore = 2;

    let mScore = 1;
    const spent = c.totalAmount;
    if (spent >= 8000000) mScore = 5;
    else if (spent >= 4000000) mScore = 4;
    else if (spent >= 2000000) mScore = 3;
    else if (spent >= 800000) mScore = 2;

    let segmentName = 'Khách hàng mới';
    let description = 'Khách vừa mới mua 1 đơn hàng đầu tiên gần đây.';

    if (rScore >= 4 && fScore >= 4 && mScore >= 4) {
      segmentName = 'VIP';
      description = 'Mua rất gần đây, tần suất lớn và chi tiêu cao nhất.';
    } else if (rScore >= 3 && fScore >= 3) {
      segmentName = 'Khách hàng Trung thành';
      description = 'Mua sắm thường xuyên, phản hồi tích cực và chi tiêu đều đặn.';
    } else if (rScore <= 2 && fScore >= 3 && mScore >= 3) {
      segmentName = 'Khách hàng Sắp rời bỏ (Churn Risk)';
      description = 'Đã từng mua nhiều và chi đậm, nhưng đã lâu chưa quay lại mua hàng.';
    } else if (rScore >= 4 && c.orderCount === 1) {
      segmentName = 'Khách hàng Mới';
      description = 'Mới mua đơn hàng đầu tiên gần đây, cần chào đón nồng nhiệt.';
    } else if (rScore <= 2 && c.orderCount <= 2) {
      segmentName = 'Khách hàng Ngủ đông (Hibernating)';
      description = 'Mua ít đơn, chi tiêu thấp và đã lâu lắm rồi không quay trở lại.';
    } else if (rScore === 3 && c.orderCount <= 2) {
      segmentName = 'Cần quan tâm (About to Sleep)';
      description = 'Hoạt động ở mức trung bình, có nguy cơ ngủ đông nếu không tiếp cận.';
    } else {
      segmentName = 'Khách hàng Tiềm năng';
      description = 'Mua sắm gần đây, mức chi tiêu khá tốt, có thể nuôi dưỡng thành Loyal.';
    }

    return {
      email,
      name: c.name,
      lastOrderDate: c.lastOrderDate.toISOString(),
      recencyDays,
      orderCount: c.orderCount,
      totalAmount: c.totalAmount,
      rScore,
      fScore,
      mScore,
      segmentName,
      description,
    };
  });

  const rfmSummary: Record<string, number> = {};
  const rfmRevenue: Record<string, number> = {};
  const rfmStatsAccumulator: Record<string, { recencySum: number; freqSum: number; count: number }> = {};

  customersArray.forEach((c) => {
    rfmSummary[c.segmentName] = (rfmSummary[c.segmentName] || 0) + 1;
    rfmRevenue[c.segmentName] = (rfmRevenue[c.segmentName] || 0) + c.totalAmount;

    if (!rfmStatsAccumulator[c.segmentName]) {
      rfmStatsAccumulator[c.segmentName] = { recencySum: 0, freqSum: 0, count: 0 };
    }
    rfmStatsAccumulator[c.segmentName].recencySum += c.recencyDays;
    rfmStatsAccumulator[c.segmentName].freqSum += c.orderCount;
    rfmStatsAccumulator[c.segmentName].count += 1;
  });

  const rfmAvgStats: Record<string, any> = {};
  Object.keys(rfmStatsAccumulator).forEach((segment) => {
    const acc = rfmStatsAccumulator[segment];
    rfmAvgStats[segment] = {
      segment,
      avgRecency: Math.round((acc.recencySum / acc.count) * 10) / 10,
      avgFrequency: Math.round((acc.freqSum / acc.count) * 10) / 10,
      avgMonetary: Math.round(rfmRevenue[segment] / acc.count),
    };
  });

  
  const matchPatterns = {
    size: /chật|rộng|ôm sát|kích|size|hơi khít|không vừa|to quá|bé quá|kích chân/i,
    comfort: /đau|cứng|mỏi|rát|phồng|bí|nóng|nhức|thốn|rát chân|bí bách|khó chịu/i,
    quality: /keo|bong|rách|chỉ|hỏng|xước|bẩn|fake|lỗi|bung|sứt|nứt|tróc|mép/i,
  };

  const reviewIssuesMap: Record<string, any> = {};
  reviews.forEach((r) => {
    const text = `${r.title || ''} ${r.content || ''}`;
    const productId = r.product_id ? r.product_id.toString() : null;
    if (!productId) return;

    const isNegative = r.rating <= 3 || r.sentiment === 'negative';
    const hasSize = matchPatterns.size.test(text);
    const hasComfort = matchPatterns.comfort.test(text);
    const hasQuality = matchPatterns.quality.test(text);

    if (hasSize || hasComfort || hasQuality) {
      if (!reviewIssuesMap[productId]) {
        reviewIssuesMap[productId] = {
          productId,
          name: r.product?.name || `Sản phẩm #${productId}`,
          image: r.product?.image || null,
          brand: r.product?.brand || 'Other',
          sizeIssues: 0,
          comfortIssues: 0,
          qualityIssues: 0,
          totalIssues: 0,
          sampleQuotes: [],
        };
      }

      const record = reviewIssuesMap[productId];
      if (hasSize) { record.sizeIssues++; record.totalIssues++; }
      if (hasComfort) { record.comfortIssues++; record.totalIssues++; }
      if (hasQuality) { record.qualityIssues++; record.totalIssues++; }

      if (isNegative && record.sampleQuotes.length < 3) {
        record.sampleQuotes.push({
          id: r.id,
          displayName: r.display_name,
          rating: r.rating,
          content: r.content,
          sentiment: r.sentiment,
          created_at: r.created_at,
        });
      }
    }
  });

  const productReviewIssues = Object.keys(reviewIssuesMap)
    .map((key) => reviewIssuesMap[key])
    .sort((a, b) => b.totalIssues - a.totalIssues);

  let totalSizeIssues = 0;
  let totalComfortIssues = 0;
  let totalQualityIssues = 0;
  const brandIssues: Record<string, any> = {};

  productReviewIssues.forEach((p) => {
    totalSizeIssues += p.sizeIssues;
    totalComfortIssues += p.comfortIssues;
    totalQualityIssues += p.qualityIssues;

    const brand = p.brand || 'Other';
    if (!brandIssues[brand]) {
      brandIssues[brand] = { brand, sizing: 0, comfort: 0, quality: 0, total: 0 };
    }
    brandIssues[brand].sizing += p.sizeIssues;
    brandIssues[brand].comfort += p.comfortIssues;
    brandIssues[brand].quality += p.qualityIssues;
    brandIssues[brand].total += p.totalIssues;
  });

  const brandIssuesArray = Object.values(brandIssues).sort((a: any, b: any) => b.total - a.total);

  return {
    success: true,
    marketBasketRules: marketBasketRules.slice(0, 15),
    customersRFM: customersArray,
    rfmSummary,
    rfmRevenue,
    rfmAvgStats,
    productReviewIssues,
    reviewsSummary: {
      totalSizeIssues,
      totalComfortIssues,
      totalQualityIssues,
      brandIssues: brandIssuesArray,
    },
  };
}
