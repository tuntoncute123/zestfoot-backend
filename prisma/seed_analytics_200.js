const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const FIRST_NAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đào", "Đoàn"];
const MIDDLE_NAMES = ["Văn", "Thị", "Minh", "Hoàng", "Đức", "Anh", "Ngọc", "Quang", "Hải", "Tuấn", "Thanh", "Bích", "Phương", "Gia", "Khánh", "Bảo", "Nhật"];
const LAST_NAMES = ["An", "Bình", "Cường", "Dũng", "Em", "Giang", "Hùng", "Hải", "Khang", "Lâm", "Nam", "Phong", "Quân", "Sơn", "Tùng", "Vinh", "Yến", "Trinh", "Trang", "Vy", "Đạt", "Linh"];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(daysBack = 365) {
  const now = Date.now();
  const pastMs = Math.floor(Math.random() * daysBack * 24 * 60 * 60 * 1000);
  return new Date(now - pastMs);
}

function generateVietnameseName() {
  return `${getRandomItem(FIRST_NAMES)} ${getRandomItem(MIDDLE_NAMES)} ${getRandomItem(LAST_NAMES)}`;
}

function removeVietnameseTones(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, '');
}

async function resetSequences() {
  const tables = ['orders', 'user_vouchers', 'game_leaderboard', 'news', 'point_transactions', 'spin_history', 'user_badge_claims', 'order_items'];
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1));`
      );
    } catch (e) {
      // Ignore sequence reset error
    }
  }
}

async function main() {
  console.log('Bắt đầu nạp thêm 200 bản ghi dữ liệu ngẫu nhiên (trải dài thời gian 365 ngày)...');
  await resetSequences();

  
  const products = await prisma.product.findMany();
  if (products.length === 0) {
    console.error('Không tìm thấy sản phẩm trong DB!');
    return;
  }

  
  console.log('Tạo 200 Profiles mới với thông tin Việt Nam...');
  const newProfiles = [];
  const tiers = ["Silver", "Gold", "Platinum", "VIP"];
  for (let i = 0; i < 200; i++) {
    const fullName = generateVietnameseName();
    const cleanName = removeVietnameseTones(fullName);
    const email = `${cleanName}${getRandomInt(1000, 99999)}@gmail.com`;
    newProfiles.push({
      id: crypto.randomUUID(),
      full_name: fullName,
      email: email,
      points: getRandomInt(50, 5000),
      tier: getRandomItem(tiers),
      totalSpent: getRandomInt(1000000, 30000000),
      spin_tickets: getRandomInt(0, 15),
      updated_at: getRandomDate(365),
    });
  }
  await prisma.profile.createMany({ data: newProfiles });
  const allProfiles = await prisma.profile.findMany();
  const profileIds = allProfiles.map(p => p.id);
  console.log(`Tổng Profiles hiện tại: ${allProfiles.length}`);

  
  console.log('Tạo 200 Orders mới trải dài 365 ngày qua...');
  const orderStatuses = ["completed", "completed", "completed", "shipped", "pending", "cancelled"];
  const paymentMethods = ["COD", "Momo", "VNPay", "ZaloPay", "CreditCard"];

  const ordersData = [];
  for (let i = 0; i < 200; i++) {
    const profile = getRandomItem(allProfiles);
    const orderDate = getRandomDate(365);
    const status = getRandomItem(orderStatuses);
    const payMethod = getRandomItem(paymentMethods);
    const prod = getRandomItem(products);
    const qty = getRandomInt(1, 3);
    const itemPrice = prod.price ? Number(prod.price) : 1800000;
    const subTotal = itemPrice * qty;
    const shippingFee = subTotal > 2000000 ? 0 : 30000;
    const discount = Math.random() > 0.6 ? 50000 : 0;
    const totalAmount = subTotal + shippingFee - discount;

    ordersData.push({
      user_id: profile.id,
      created_at: orderDate,
      customer: {
        name: profile.full_name,
        email: profile.email,
        phone: `09${getRandomInt(10000000, 99999999)}`,
        address: `${getRandomInt(1, 200)} Đường Nguyễn Trãi, Quận 1, TP.HCM`
      },
      items: [
        {
          id: Number(prod.id),
          name: prod.name,
          price: itemPrice,
          quantity: qty,
          image: prod.image
        }
      ],
      sub_total: subTotal,
      shipping_fee: shippingFee,
      discount: discount,
      total_amount: totalAmount,
      status: status,
      payment_method: payMethod,
      voucher_discount: discount
    });
  }

  await prisma.order.createMany({ data: ordersData });
  const recentOrders = await prisma.order.findMany({ take: 200, orderBy: { created_at: 'desc' }, select: { id: true } });

  const orderItemsData = [];
  for (let i = 0; i < recentOrders.length; i++) {
    const ord = recentOrders[i];
    const prod = getRandomItem(products);
    const qty = getRandomInt(1, 3);
    const itemPrice = prod.price ? Number(prod.price) : 1800000;
    orderItemsData.push({
      order_id: ord.id,
      product_id: prod.id,
      price: itemPrice,
      quantity: qty,
      total: itemPrice * qty
    });
  }
  await prisma.orderItem.createMany({ data: orderItemsData });
  console.log(`Tổng Orders hiện tại: ${await prisma.order.count()}, OrderItems: ${await prisma.orderItem.count()}`);

  
  console.log('Tạo 200 Reviews với Sentiment AI trải dài 365 ngày...');
  const positiveReviews = [
    { title: "Giày đẹp xuất sắc!", content: "Đi cực kỳ êm chân, đúng size, giao hàng siêu nhanh. Sẽ tiếp tục ủng hộ ZestFoot!", rating: 5, sentiment: "POSITIVE", score: 0.95 },
    { title: "Chất lượng vượt mong đợi", content: "Đóng gói 2 lớp chắc chắn, giày không một vết xước. Form mang lên rất ôm chân.", rating: 5, sentiment: "POSITIVE", score: 0.92 },
    { title: "Rất đáng tiền", content: "Đôi này đi phối đồ streetwear chuẩn bài luôn. Da mềm và không bị đau gót.", rating: 5, sentiment: "POSITIVE", score: 0.88 },
    { title: "Đẹp như hình chụp", content: "Shop tư vấn nhiệt tình chọn size chuẩn đét. Giày chính hãng 100%.", rating: 4, sentiment: "POSITIVE", score: 0.85 }
  ];
  const neutralReviews = [
    { title: "Giày đi tạm ổn", content: "Đã nhận hàng, chất lượng tương đối ổn trong tầm giá. Giao hàng hơi chậm 1 ngày.", rating: 3, sentiment: "NEUTRAL", score: 0.50 },
    { title: "Form hơi rộng chút", content: "Nên lùi nửa size nếu chân mỏng nhé mọi người. Giày thì đẹp nhưng mang hơi nhấc gót nhẹ.", rating: 3, sentiment: "NEUTRAL", score: 0.48 }
  ];
  const negativeReviews = [
    { title: "Hộp giày bị móp", content: "Giao hàng làm móp mất hộp giày cưng của mình. Giày bên trong thì không sao nhưng thất vọng vận chuyển.", rating: 2, sentiment: "NEGATIVE", score: 0.20 },
    { title: "Hơi cứng khi mới đi", content: "Chất liệu da hơi cứng trong vài ngày đầu, phải đi tất dày mới không bị đau.", rating: 2, sentiment: "NEGATIVE", score: 0.25 }
  ];

  const reviewList = [...positiveReviews, ...positiveReviews, ...positiveReviews, ...neutralReviews, ...negativeReviews];
  const reviewsData = [];

  for (let i = 0; i < 200; i++) {
    const prof = getRandomItem(allProfiles);
    const prod = getRandomItem(products);
    const sample = getRandomItem(reviewList);
    const rDate = getRandomDate(365);

    reviewsData.push({
      product_id: prod.id,
      user_id: prof.id,
      rating: sample.rating,
      title: sample.title,
      content: sample.content,
      display_name: prof.full_name || "Khách hàng",
      email: prof.email,
      sentiment: sample.sentiment,
      sentiment_score: sample.score,
      sentiment_explanation: `Đánh giá được phân tích tự động có thái độ ${sample.sentiment.toLowerCase()}.`,
      created_at: rDate
    });
  }
  for (const r of reviewsData) {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "reviews" ("id", "product_id", "user_id", "rating", "title", "content", "display_name", "email", "sentiment", "sentiment_score", "sentiment_explanation", "created_at")
         VALUES (gen_random_uuid(), $1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamptz)`,
        r.product_id, r.user_id, r.rating, r.title, r.content, r.display_name, r.email, r.sentiment, r.sentiment_score, r.sentiment_explanation, r.created_at
      );
    } catch (e) {
      // Ignore if product or profile deleted
    }
  }
  console.log(`Tổng Reviews hiện tại: ${await prisma.review.count()}`);

  
  console.log('Tạo 200 PointTransactions mới...');
  const earnReasons = ["Tích điểm đơn hàng mua thành công", "Thưởng review sản phẩm", "Điểm danh hàng ngày", "Quà tặng sinh nhật"];
  const spendReasons = ["Đổi mã giảm giá 50k", "Đổi quà tặng phụ kiện", "Tham gia Vòng quay lucky spin"];
  const pointTxData = [];
  for (let i = 0; i < 200; i++) {
    const isEarn = Math.random() > 0.35;
    pointTxData.push({
      user_id: getRandomItem(profileIds),
      amount: isEarn ? getRandomInt(100, 500) : getRandomInt(50, 200),
      reason: isEarn ? getRandomItem(earnReasons) : getRandomItem(spendReasons),
      type: isEarn ? "earn" : "spend",
      created_at: getRandomDate(365)
    });
  }
  await prisma.pointTransaction.createMany({ data: pointTxData });
  console.log(`Tổng PointTransactions hiện tại: ${await prisma.pointTransaction.count()}`);

  
  console.log('Tạo 200 UserVouchers mới...');
  const voucherData = [];
  const statuses = ["active", "used", "expired"];
  for (let i = 0; i < 200; i++) {
    const cDate = getRandomDate(365);
    const expDate = new Date(cDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    voucherData.push({
      user_id: getRandomItem(profileIds),
      code: `VOUCHER-${getRandomInt(10, 99)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      discount_amount: getRandomItem([30000, 50000, 100000, 200000]),
      min_order_value: getRandomItem([200000, 500000, 1000000]),
      status: getRandomItem(statuses),
      created_at: cDate,
      expires_at: expDate
    });
  }
  await prisma.userVoucher.createMany({ data: voucherData });
  console.log(`Tổng UserVouchers hiện tại: ${await prisma.userVoucher.count()}`);

  
  console.log('Tạo 200 DailyGamePlays mới...');
  const games = ["Lucky Spin", "Sneaker Quiz", "Memory Match"];
  const gamePlayData = [];
  for (let i = 0; i < 200; i++) {
    gamePlayData.push({
      user_id: getRandomItem(profileIds),
      game_name: getRandomItem(games),
      last_played_at: getRandomDate(365)
    });
  }
  await prisma.dailyGamePlay.createMany({ data: gamePlayData });
  console.log(`Tổng DailyGamePlays hiện tại: ${await prisma.dailyGamePlay.count()}`);

  
  console.log('Tạo 200 SocialPosts, SocialComments & SocialReactions mới...');
  const postCaptions = [
    "Hôm nay lên chân em Air Force 1 đi làm, sếp khen đẹp nức nở ",
    "Góc flex bộ sưu tập giày Sneaker của tớ sau 2 năm tích góp ",
    "Kinh nghiệm săn sale 11/11 tại ZestFoot hời được hẳn 500k ",
    "Có ai nghiện phối đồ style Vintage giống mình không?",
    "Review chân thực đôi Asics chạy bộ 10km không hề đau chân!"
  ];
  const postImages = [
    "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600",
    "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600"
  ];

  const postsData = [];
  for (let i = 0; i < 200; i++) {
    postsData.push({
      user_id: getRandomItem(profileIds),
      caption: getRandomItem(postCaptions),
      image: getRandomItem(postImages),
      created_at: getRandomDate(365)
    });
  }
  await prisma.socialPost.createMany({ data: postsData });
  const allSocialPosts = await prisma.socialPost.findMany({ take: 200, orderBy: { created_at: 'desc' }, select: { id: true } });

  const commentsData = [];
  const reactionsData = [];
  const commentTexts = ["Đẹp quá bạn ơi!", "Hợp dáng lắm!", "ZestFoot bán uy tín thực sự", "Giao hàng nhanh gọn lẹ!"];

  for (const post of allSocialPosts) {
    commentsData.push({
      post_id: post.id,
      user_id: getRandomItem(profileIds),
      content: getRandomItem(commentTexts),
      created_at: getRandomDate(365)
    });
    reactionsData.push({
      post_id: post.id,
      user_id: getRandomItem(profileIds),
      reaction_type: getRandomItem(["like", "love", "fire"]),
      created_at: getRandomDate(365)
    });
  }
  await prisma.socialComment.createMany({ data: commentsData });
  await prisma.socialReaction.createMany({ data: reactionsData });
  console.log(`Tổng SocialPosts: ${await prisma.socialPost.count()}, Comments: ${await prisma.socialComment.count()}, Reactions: ${await prisma.socialReaction.count()}`);

  
  console.log('Tạo 200 GameLeaderboard mới...');
  const leaderboardData = [];
  for (let i = 0; i < 200; i++) {
    leaderboardData.push({
      user_id: getRandomItem(profileIds),
      game_name: getRandomItem(["Lucky Spin", "Sneaker Runner", "Memory Match"]),
      score: getRandomInt(200, 2500),
      created_at: getRandomDate(365)
    });
  }
  await prisma.gameLeaderboard.createMany({ data: leaderboardData });
  console.log(`Tổng GameLeaderboard hiện tại: ${await prisma.gameLeaderboard.count()}`);

  
  console.log('Tạo 200 QrTickets mới...');
  const qrTicketsData = [];
  for (let i = 0; i < 200; i++) {
    const cDate = getRandomDate(365);
    const expDate = new Date(cDate.getTime() + 60 * 24 * 60 * 60 * 1000);
    const isUsed = Math.random() > 0.4;
    qrTicketsData.push({
      id: `QR-200-${getRandomInt(100000, 999999)}-${i}`,
      user_id: getRandomItem(profileIds),
      is_used: isUsed,
      used_at: isUsed ? new Date(cDate.getTime() + 2 * 24 * 60 * 60 * 1000) : null,
      created_at: cDate,
      expired_at: expDate
    });
  }
  await prisma.qrTicket.createMany({ data: qrTicketsData });
  console.log(`Tổng QrTickets hiện tại: ${await prisma.qrTicket.count()}`);

  
  console.log('Tạo 200 SpinHistory mới...');
  const prizes = [
    { name: "Voucher 50.000₫", type: "voucher" },
    { name: "200 Điểm thưởng", type: "point" },
    { name: "Túi Tote ZestFoot Edition", type: "gift" },
    { name: "Voucher 100.000₫", type: "voucher" },
    { name: "Bộ Vệ Sinh Giày Sneaker", type: "gift" }
  ];
  const spinData = [];
  for (let i = 0; i < 200; i++) {
    const prof = getRandomItem(allProfiles);
    const pz = getRandomItem(prizes);
    spinData.push({
      user_id: prof.id,
      user_name: prof.full_name || "Khách hàng ZestFoot",
      prize_name: pz.name,
      prize_type: pz.type,
      created_at: getRandomDate(365)
    });
  }
  await prisma.spinHistory.createMany({ data: spinData });
  console.log(`Tổng SpinHistory hiện tại: ${await prisma.spinHistory.count()}`);

  
  console.log('Tạo 200 UserBadgeClaims mới...');
  const claimsData = [];
  for (let i = 0; i < 200; i++) {
    claimsData.push({
      user_id: getRandomItem(profileIds),
      shoe_size: getRandomItem([38, 39, 40, 41, 42, 43, 44]),
      order_id: `ORD-CLAIM-${getRandomInt(1000, 9999)}`,
      created_at: getRandomDate(365)
    });
  }
  await prisma.userBadgeClaim.createMany({ data: claimsData });
  console.log(`Tổng UserBadgeClaims hiện tại: ${await prisma.userBadgeClaim.count()}`);

  
  console.log('Tạo 200 News tin tức bài viết mới...');
  const newsTopics = [
    "Đánh Giá Chi Tiết Siêu Phẩm Sneaker Mới Ra Mắt",
    "Xu Hướng Phối Đồ Thu Đông Cực Chất Cho Giới Trẻ",
    "Top 5 Mẫu Giày Thể Thao Bền Bỉ Cho Dân Chạy Bộ",
    "Cách Nhận Biết Sneaker Chính Hãng Nhanh Nhất",
    "Hành Trình Tái Chế Giày Cũ Của ZestFoot Vì Môi Trường"
  ];
  const newsData = [];
  for (let i = 0; i < 200; i++) {
    const topic = newsTopics[i % newsTopics.length];
    const nDate = getRandomDate(365);
    newsData.push({
      title: `${topic} - Kỳ #${i + 1}`,
      excerpt: `Cập nhật những thông tin mới nhất về thời trang sneaker và phong cách sống hiện đại...`,
      image: `https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600`,
      date: `${nDate.getDate()}/${nDate.getMonth() + 1}/${nDate.getFullYear()}`,
      content: `Nội dung chi tiết bài viết tin tức xu hướng sneaker được cập nhật liên tục trên ZestFoot...`
    });
  }
  await prisma.news.createMany({ data: newsData });
  console.log(`Tổng News hiện tại: ${await prisma.news.count()}`);

  console.log('Hoàn tất quá trình nạp thành công 200 bản ghi dữ liệu phân tích!');
}

main()
  .catch(e => console.error('Lỗi khi nạp dữ liệu:', e))
  .finally(async () => await prisma.$disconnect());
