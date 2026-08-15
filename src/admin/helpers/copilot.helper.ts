export function buildCopilotSystemPrompt(
  kpiStatsText: string,
  gameRoiText: string,
  demandForecastText: string,
  customerMlText: string,
  reviewIssuesText: string
): string {
  return `Bạn là Trợ lý Quản trị Kinh doanh AI (Ollama Local) của cửa hàng giày cao cấp ZestFoot.
Nhiệm vụ của bạn là hỗ trợ ban quản trị (Admin) phân tích tình hình kinh doanh, doanh thu, hành vi khách hàng, hiệu quả gamification và đưa ra các đề xuất chiến lược tối ưu hóa lợi nhuận, chiến dịch marketing hoặc phát hành voucher.

Dưới đây là DỮ LIỆU KHO DỮ LIỆU (DWH) & HỌC MÁY (ML) hiện tại của cửa hàng ZestFoot được tổng hợp trực tiếp từ hệ thống:

[1. KẾT QUẢ KINH DOANH & ĐIỂM THƯỞNG DWH]
${kpiStatsText}

[2. CHIẾN DỊCH KHUYẾN MÃI & GAME ROI]
${gameRoiText}

[3. DỰ BÁO NHU CẦU SẢN PHẨM ML (Demand Forecasting)]
${demandForecastText}

[4. PHÂN TÍCH KHÁCH HÀNG & NGUY CƠ RỜI BỎ ML (Churn & Voucher Propensity)]
${customerMlText}

[5. KHAI PHÁ ĐÁNH GIÁ & VẤN ĐỀ SẢN PHẨM (Review Text Mining)]
${reviewIssuesText}

HƯỚNG DẪN TRẢ LỜI:
1. Bạn phải dựa TRỰC TIẾP trên dữ liệu thực tế ở trên để đưa ra các phân tích, con số chính xác. Tuyệt đối không tự bịa ra số liệu không có trong ngữ cảnh.
2. Trả lời bằng tiếng Việt chuyên nghiệp, khoa học, dễ hiểu, trình bày bảng biểu hoặc gạch đầu dòng Markdown rõ ràng.
3. Khi phân tích cơ hội phát hành Voucher, hãy khuyên dùng các mã cụ thể dựa trên xu hướng Mini-game hoặc sensitivity của khách (Ví dụ: SNAKE10 cho nhóm nhạy cảm giá trung bình, WHEEL- cho nhóm thích may mắn).
4. Phân tích điểm yếu sản phẩm dựa vào thống kê đánh giá (chật size, chất lượng keo, v.v.) và đưa ra đề xuất nhập hàng hoặc cải thiện CSKH.`;
}

export function compileCopilotContext(
  sales: any[],
  engagement: any[],
  vouchers: any[],
  reviews: any[]
): {
  kpiStatsText: string;
  gameRoiText: string;
  reviewIssuesText: string;
} {
  const deliveredOrders: any[] = [];
  const orderMap: Record<string, any> = {};
  
  sales.forEach((item) => {
    if (item.status === 'delivered') {
      const orderId = item.id.toString();
      if (!orderMap[orderId]) {
        orderMap[orderId] = {
          total_amount: Number(item.total_amount) || 0,
          voucher_discount: Number(item.voucher_discount) || 0,
          point_discount: Number(item.point_discount) || 0,
          discount: Number(item.discount) || 0,
          voucher_code: item.voucher_code,
        };
        deliveredOrders.push(orderMap[orderId]);
      }
    }
  });

  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalOrdersCount = deliveredOrders.length;
  const aov = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
  const totalVoucherDiscount = deliveredOrders.reduce((sum, o) => sum + o.voucher_discount, 0);
  const totalPointDiscount = deliveredOrders.reduce((sum, o) => sum + o.point_discount, 0);

  const pointEarnEvents = engagement.filter((e) => e.type === 'earn');
  const pointSpendEvents = engagement.filter((e) => e.type === 'spend');
  const totalPointsEarned = pointEarnEvents.reduce((sum, e) => sum + e.amount, 0);
  const totalPointsSpent = Math.abs(pointSpendEvents.reduce((sum, e) => sum + e.amount, 0));

  const kpiStatsText = `Doanh thu thực tế (đã giao): ${totalRevenue.toLocaleString('vi-VN')}đ
Tổng số đơn hàng thành công: ${totalOrdersCount} đơn
Giá trị trung bình đơn (AOV): ${aov.toLocaleString('vi-VN')}đ
Tổng chiết khấu từ Voucher: ${totalVoucherDiscount.toLocaleString('vi-VN')}đ
Tổng chiết khấu đổi Xu tích điểm: ${totalPointDiscount.toLocaleString('vi-VN')}đ
Tổng điểm thưởng đã phát: ${totalPointsEarned} Xu
Tổng điểm thưởng khách đã tiêu: ${totalPointsSpent} Xu`;

  const games: Record<string, any> = {
    luckyWheel: { name: 'Vòng Quay May Mắn', prefix: 'WHEEL-', issued: 0, used: 0, revenue: 0, cost: 0 },
    snake: { name: 'Rắn Săn Mồi', prefix: 'SNAKE', issued: 0, used: 0, revenue: 0, cost: 0 },
    tetris: { name: 'Xếp Gạch', prefix: 'TETRIS', issued: 0, used: 0, revenue: 0, cost: 0 },
    shoeMatch: { name: 'Ghép Giày', prefix: 'MATCH', issued: 0, used: 0, revenue: 0, cost: 0 },
  };

  vouchers.forEach((v) => {
    const code = v.code || '';
    let key = null;
    if (code.startsWith('WHEEL-')) key = 'luckyWheel';
    else if (code.startsWith('SNAKE')) key = 'snake';
    else if (code.startsWith('TETRIS')) key = 'tetris';
    else if (code.startsWith('MATCH')) key = 'shoeMatch';

    if (key) {
      games[key].issued++;
      if (v.status === 'used') games[key].used++;
    }
  });

  deliveredOrders.forEach((o) => {
    if (o.voucher_discount > 0 && o.voucher_code) {
      const code = o.voucher_code;
      let key = null;
      if (code.startsWith('WHEEL-')) key = 'luckyWheel';
      else if (code.startsWith('SNAKE')) key = 'snake';
      else if (code.startsWith('TETRIS')) key = 'tetris';
      else if (code.startsWith('MATCH')) key = 'shoeMatch';

      if (key) {
        games[key].revenue += o.total_amount;
        games[key].cost += o.voucher_discount;
      }
    }
  });

  const gameRoiText = Object.keys(games)
    .map((key) => {
      const g = games[key];
      const profit = g.revenue - g.cost;
      const roi = g.cost > 0 ? ((profit / g.cost) * 100).toFixed(1) : '0';
      const conv = g.issued > 0 ? ((g.used / g.issued) * 100).toFixed(1) : '0';
      return `- ${g.name} (${g.prefix}): Phát hành ${g.issued} voucher, Sử dụng ${g.used} (Tỷ lệ chuyển đổi: ${conv}%), Doanh thu mang lại: ${g.revenue.toLocaleString('vi-VN')}đ, Chi phí chiết khấu: ${g.cost.toLocaleString('vi-VN')}đ, Net Revenue: ${profit.toLocaleString('vi-VN')}đ, ROI: ${roi}%`;
    })
    .join('\n');

  const reviewIssues: Record<string, any> = {};
  const matchPatterns = {
    size: /chật|rộng|ôm sát|kích|size|hơi khít|không vừa|to quá|bé quá|kích chân/i,
    comfort: /đau|cứng|mỏi|rát|phồng|bí|nóng|nhức|thốn|rát chân|bí bách|khó chịu/i,
    quality: /keo|bong|rách|chỉ|hỏng|xước|bẩn|fake|lỗi|bung|sứt|nứt|tróc|mép/i,
  };

  reviews.forEach((r) => {
    const text = `${r.title || ''} ${r.content || ''}`;
    const p = r.product;
    if (!p) return;

    const hasSize = matchPatterns.size.test(text);
    const hasComfort = matchPatterns.comfort.test(text);
    const hasQuality = matchPatterns.quality.test(text);

    if (hasSize || hasComfort || hasQuality) {
      if (!reviewIssues[p.name]) {
        reviewIssues[p.name] = { brand: p.brand, size: 0, comfort: 0, quality: 0, total: 0 };
      }
      if (hasSize) { reviewIssues[p.name].size++; reviewIssues[p.name].total++; }
      if (hasComfort) { reviewIssues[p.name].comfort++; reviewIssues[p.name].total++; }
      if (hasQuality) { reviewIssues[p.name].quality++; reviewIssues[p.name].total++; }
    }
  });

  const topIssues = Object.keys(reviewIssues)
    .map((name) => ({ name, ...reviewIssues[name] }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  let reviewIssuesText = 'Chưa phát hiện vấn đề nghiêm trọng nào từ đánh giá.';
  if (topIssues.length > 0) {
    reviewIssuesText = topIssues
      .map(
        (p) =>
          `- Giày "${p.name}" (${p.brand}): Có ${p.total} phản ánh tiêu cực. (Lỗi Kích cỡ/Size: ${p.size}, Độ êm ái: ${p.comfort}, Chất lượng hoàn thiện/Keo: ${p.quality})`,
      )
      .join('\n');
  }

  return {
    kpiStatsText,
    gameRoiText,
    reviewIssuesText,
  };
}

export function formatDemandForecast(forecasts: any[]): string {
  if (!forecasts || !Array.isArray(forecasts)) {
    return 'Chưa cấu hình dịch vụ Python ML.';
  }
  return forecasts
    .map(
      (f) =>
        `- Hãng ${f.brand}: Trung bình hiện tại: ${f.current_avg} đôi/tháng. Dự đoán tháng tới: ${f.forecast_1m} đôi, Dự đoán 3 tháng tới: ${f.forecast_3m} đôi, Dự đoán 6 tháng tới: ${f.forecast_6m} đôi`,
    )
    .join('\n');
}

export function formatCustomerMlScores(customerScores: any[]): string {
  if (!customerScores || !Array.isArray(customerScores)) {
    return 'Chưa cấu hình dịch vụ Python ML.';
  }
  const churnGroup: Record<string, number> = { 'Nguy cơ cao': 0, 'Trung bình': 0, 'An toàn': 0 };
  const actionGroup: Record<string, number> = { 'Gửi Voucher Ngay': 0, 'Không cần Voucher': 0 };
  customerScores.forEach((c: any) => {
    churnGroup[c.status] = (churnGroup[c.status] || 0) + 1;
    actionGroup[c.action] = (actionGroup[c.action] || 0) + 1;
  });
  return `- Phân nhóm nguy cơ rời bỏ (Churn Risk):
  + Nguy cơ rời bỏ cao (Churn >= 70%): ${churnGroup['Nguy cơ cao']} khách hàng
  + Nguy cơ trung bình (35-70%): ${churnGroup['Trung bình']} khách hàng
  + An toàn (<35%): ${churnGroup['An toàn']} khách hàng
- Đề xuất gửi chiến dịch Voucher (Độ nhạy bén chiết khấu):
  + Cần gửi Voucher để kích cầu (Sensitvity cao): ${actionGroup['Gửi Voucher Ngay']} khách hàng
  + Không cần gửi Voucher (Trung thành / Mua không phụ thuộc giá): ${actionGroup['Không cần Voucher']} khách hàng`;
}

export function getMlFallbackTexts(): { demandForecastText: string; customerMlText: string } {
  return {
    demandForecastText: 'Kết nối FastAPI thất bại. Không thể tải dự báo nhu cầu bán hàng.',
    customerMlText: 'Kết nối FastAPI thất bại. Không thể tải thống kê churn khách hàng.',
  };
}
