const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const FIRST_NAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const MIDDLE_NAMES = ["Văn", "Thị", "Minh", "Hoàng", "Đức", "Anh", "Ngọc", "Quang", "Hải", "Tuấn", "Thanh", "Bích", "Phương", "Gia", "Khánh"];
const LAST_NAMES = ["An", "Bình", "Cường", "Dũng", "Em", "Giang", "Hùng", "Hải", "Khang", "Lâm", "Nam", "Phong", "Quân", "Sơn", "Tùng", "Vinh", "Yến", "Trinh", "Trang", "Vy"];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

async function resetSequences(prisma) {
  const tables = ['user_vouchers', 'game_leaderboard', 'news', 'point_transactions', 'spin_history', 'user_badge_claims', 'order_items'];
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
  console.log('🚀 Bắt đầu quá trình seed dữ liệu 100+ bản ghi cho Admin Analytics...');
  await resetSequences(prisma);

  
  let existingProfiles = await prisma.profile.findMany();
  console.log(`📌 Profiles hiện có: ${existingProfiles.length}`);

  const neededProfiles = Math.max(0, 105 - existingProfiles.length);
  if (neededProfiles > 0) {
    console.log(`➕ Đang tạo thêm ${neededProfiles} profiles mới...`);
    const newProfilesData = [];
    for (let i = 0; i < neededProfiles; i++) {
      const fullName = generateVietnameseName();
      const cleanName = removeVietnameseTones(fullName);
      const email = `${cleanName}${getRandomInt(100, 9999)}@gmail.com`;
      const points = getRandomInt(10, 2500);
      const tiers = ["Silver", "Gold", "Platinum", "VIP"];
      const tier = tiers[Math.floor(Math.random() * tiers.length)];
      const totalSpent = getRandomInt(500000, 15000000);

      newProfilesData.push({
        id: crypto.randomUUID(),
        full_name: fullName,
        email: email,
        points: points,
        tier: tier,
        totalSpent: totalSpent,
        spin_tickets: getRandomInt(1, 10),
        updated_at: new Date(),
      });
    }
    await prisma.profile.createMany({ data: newProfilesData });
    existingProfiles = await prisma.profile.findMany();
    console.log(`✅ Profiles sau khi bổ sung: ${existingProfiles.length}`);
  }

  const profileIds = existingProfiles.map(p => p.id);

  
  const existingProducts = await prisma.product.findMany();
  const existingOrders = await prisma.order.findMany();
  console.log(`📌 Products hiện có: ${existingProducts.length}, Orders hiện có: ${existingOrders.length}`);

  
  const existingOrderItemsCount = await prisma.orderItem.count();
  if (existingOrderItemsCount < 100 && existingOrders.length > 0 && existingProducts.length > 0) {
    console.log(`➕ Đang nạp OrderItems...`);
    const orderItemsData = [];
    for (const order of existingOrders) {
      const numItems = getRandomInt(1, 3);
      for (let j = 0; j < numItems; j++) {
        const prod = getRandomItem(existingProducts);
        const qty = getRandomInt(1, 2);
        const price = prod.price ? Number(prod.price) : 2000000;
        orderItemsData.push({
          order_id: order.id,
          product_id: prod.id,
          price: price,
          quantity: qty,
          total: price * qty,
        });
      }
    }
    await prisma.orderItem.createMany({ data: orderItemsData });
    console.log(`✅ OrderItems sau khi nạp: ${await prisma.orderItem.count()}`);
  }

  
  const existingPointTxCount = await prisma.pointTransaction.count();
  if (existingPointTxCount < 100) {
    console.log(`➕ Đang nạp PointTransactions...`);
    const reasonsEarn = [
      "Thưởng tích điểm mua đơn hàng thành công",
      "Thưởng hoàn thành nhiệm vụ đăng ký tài khoản",
      "Thưởng trò chơi Vòng quay may mắn",
      "Thưởng viết đánh giá sản phẩm có kèm ảnh",
      "Điểm danh hàng ngày ZestFoot Rewards"
    ];
    const reasonsSpend = [
      "Đổi voucher giảm giá 50.000₫",
      "Đổi vé tham gia Raffle quà tặng limited",
      "Đổi mã miễn phí vận chuyển Freeship",
      "Đổi quà tặng phụ kiện dây giày & vớ Sneaker"
    ];

    const pointTxData = [];
    for (let i = 0; i < 110; i++) {
      const isEarn = Math.random() > 0.3;
      const type = isEarn ? "earn" : "spend";
      const amount = isEarn ? getRandomInt(50, 500) : getRandomInt(20, 200);
      const reason = isEarn ? getRandomItem(reasonsEarn) : getRandomItem(reasonsSpend);
      const userId = getRandomItem(profileIds);
      const daysAgo = getRandomInt(1, 90);
      const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      pointTxData.push({
        user_id: userId,
        amount: amount,
        reason: reason,
        type: type,
        created_at: date
      });
    }
    await prisma.pointTransaction.createMany({ data: pointTxData });
    console.log(`✅ PointTransactions sau khi nạp: ${await prisma.pointTransaction.count()}`);
  }

  
  const existingVouchersCount = await prisma.userVoucher.count();
  if (existingVouchersCount < 100) {
    console.log(`➕ Đang bổ sung UserVouchers...`);
    const voucherData = [];
    const statuses = ["active", "used", "expired"];
    for (let i = 0; i < 20; i++) {
      const code = `RFM-${getRandomInt(10, 99)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const userId = getRandomItem(profileIds);
      const status = getRandomItem(statuses);
      const createdAt = new Date(Date.now() - getRandomInt(5, 60) * 24 * 60 * 60 * 1000);
      const expiresAt = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);

      voucherData.push({
        user_id: userId,
        code: code,
        discount_amount: getRandomItem([20000, 50000, 100000]),
        min_order_value: getRandomItem([200000, 500000]),
        status: status,
        created_at: createdAt,
        expires_at: expiresAt
      });
    }
    await prisma.userVoucher.createMany({ data: voucherData });
    console.log(`✅ UserVouchers sau khi nạp: ${await prisma.userVoucher.count()}`);
  }

  
  const existingDailyGamePlays = await prisma.dailyGamePlay.count();
  if (existingDailyGamePlays < 100) {
    console.log(`➕ Đang nạp DailyGamePlays...`);
    const games = ["Lucky Spin", "Sneaker Quiz", "Memory Match"];
    const gamePlayData = [];
    for (let i = 0; i < 110; i++) {
      const userId = getRandomItem(profileIds);
      const game = getRandomItem(games);
      const daysAgo = getRandomInt(0, 45);
      gamePlayData.push({
        user_id: userId,
        game_name: game,
        last_played_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      });
    }
    await prisma.dailyGamePlay.createMany({ data: gamePlayData });
    console.log(`✅ DailyGamePlays sau khi nạp: ${await prisma.dailyGamePlay.count()}`);
  }

  
  const existingSocialPostsCount = await prisma.socialPost.count();
  if (existingSocialPostsCount < 100) {
    console.log(`➕ Đang nạp SocialPosts, Comments & Reactions...`);
    const captions = [
      "Vừa đập hộp em Nike Air Force 1 cực xịn tại ZestFoot! 🔥😎",
      "Phối đồ streetwear cùng Converse Chuck 70 đen cổ cao classic ✨",
      "Đôi Asics Gel-Kayano đi chạy bộ đúng đỉnh, quá êm chân 🏃‍♂️💨",
      "Vans Old Skool phối cùng quần ống rộng bao ngầu nhé mảng outfit ngày hè 👟💯",
      "Bộ sưu tập Sneaker cưng nhất phòng mình nè cả nhà ơi! ❤️",
      "Giày Puma Suede form bao múp, đi lên chân tôn dáng hết nấc 🎯",
      "Săn sale được mã giảm 50k mua đôi Adidas Superstar quá hời luôn 🎉"
    ];
    const images = [
      "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600",
      "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600",
      "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600"
    ];

    const postsData = [];
    for (let i = 0; i < 105; i++) {
      const userId = getRandomItem(profileIds);
      const caption = getRandomItem(captions);
      const img = getRandomItem(images);
      const daysAgo = getRandomInt(1, 60);

      postsData.push({
        user_id: userId,
        caption: caption,
        image: img,
        created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      });
    }
    await prisma.socialPost.createMany({ data: postsData });
    console.log(`✅ SocialPosts sau khi nạp: ${await prisma.socialPost.count()}`);

    const createdPosts = await prisma.socialPost.findMany();
    const commentsData = [];
    const reactionsData = [];
    const commentTexts = [
      "Đôi này lên chân đẹp quá bạn ơi!",
      "Shop bán hàng giao nhanh ghê, chúc mừng bạn nhé 🔥",
      "Phối với quần jeans hợp cực kỳ lun",
      "Xin chỗ mua phụ kiện dây giày giống bạn với 👟",
      "Đôi này đi đúng true size không bạn?",
      "Nhìn ghiền quá, chắc cũng phải xúc 1 em thôi 😎",
      "ZestFoot đóng gói cẩn thận 10/10 điểm!"
    ];
    const rxTypes = ["like", "love", "fire"];

    for (const post of createdPosts) {
      
      const numC = getRandomInt(1, 2);
      for (let c = 0; c < numC; c++) {
        commentsData.push({
          post_id: post.id,
          user_id: getRandomItem(profileIds),
          content: getRandomItem(commentTexts),
          created_at: new Date()
        });
      }

      
      const numR = getRandomInt(1, 2);
      for (let r = 0; r < numR; r++) {
        reactionsData.push({
          post_id: post.id,
          user_id: getRandomItem(profileIds),
          reaction_type: getRandomItem(rxTypes),
          created_at: new Date()
        });
      }
    }

    await prisma.socialComment.createMany({ data: commentsData });
    await prisma.socialReaction.createMany({ data: reactionsData });
    console.log(`✅ SocialComments: ${await prisma.socialComment.count()}, SocialReactions: ${await prisma.socialReaction.count()}`);
  }

  
  const existingLeaderboardCount = await prisma.gameLeaderboard.count();
  if (existingLeaderboardCount < 100) {
    console.log(`➕ Đang bổ sung GameLeaderboard...`);
    const leaderboardData = [];
    const games = ["Lucky Spin", "Sneaker Runner", "Memory Match"];
    for (let i = 0; i < 55; i++) {
      const userId = getRandomItem(profileIds);
      const game = getRandomItem(games);
      const score = getRandomInt(100, 1500);

      leaderboardData.push({
        user_id: userId,
        game_name: game,
        score: score,
        created_at: new Date(Date.now() - getRandomInt(1, 30) * 24 * 60 * 60 * 1000)
      });
    }
    await prisma.gameLeaderboard.createMany({ data: leaderboardData });
    console.log(`✅ GameLeaderboard sau khi nạp: ${await prisma.gameLeaderboard.count()}`);
  }

  
  const existingQrTicketsCount = await prisma.qrTicket.count();
  if (existingQrTicketsCount < 100) {
    console.log(`➕ Đang nạp QrTickets...`);
    const ticketsData = [];
    for (let i = 0; i < 105; i++) {
      const id = `QR-ZEST-${getRandomInt(10000, 99999)}-${i}`;
      const userId = getRandomItem(profileIds);
      const isUsed = Math.random() > 0.5;
      const createdAt = new Date(Date.now() - getRandomInt(1, 60) * 24 * 60 * 60 * 1000);
      const expiredAt = new Date(createdAt.getTime() + 60 * 24 * 60 * 60 * 1000);
      const usedAt = isUsed ? new Date(createdAt.getTime() + getRandomInt(1, 5) * 24 * 60 * 60 * 1000) : null;

      ticketsData.push({
        id: id,
        user_id: userId,
        is_used: isUsed,
        used_at: usedAt,
        created_at: createdAt,
        expired_at: expiredAt
      });
    }
    await prisma.qrTicket.createMany({ data: ticketsData });
    console.log(`✅ QrTickets sau khi nạp: ${await prisma.qrTicket.count()}`);
  }

  
  const existingSpinHistoryCount = await prisma.spinHistory.count();
  if (existingSpinHistoryCount < 100) {
    console.log(`➕ Đang nạp SpinHistory...`);
    const prizes = [
      { name: "Voucher 50.000₫", type: "voucher" },
      { name: "100 Điểm thưởng", type: "point" },
      { name: "Túi Tote ZestFoot Premium", type: "gift" },
      { name: "Voucher 100.000₫", type: "voucher" },
      { name: "50 Điểm thưởng", type: "point" },
      { name: "Móc khóa Sneaker kỉ niệm", type: "gift" }
    ];

    const spinData = [];
    for (let i = 0; i < 110; i++) {
      const p = getRandomItem(existingProfiles);
      const prize = getRandomItem(prizes);

      spinData.push({
        user_id: p.id,
        user_name: p.full_name || "Khách hàng ZestFoot",
        prize_name: prize.name,
        prize_type: prize.type,
        created_at: new Date(Date.now() - getRandomInt(1, 45) * 24 * 60 * 60 * 1000)
      });
    }
    await prisma.spinHistory.createMany({ data: spinData });
    console.log(`✅ SpinHistory sau khi nạp: ${await prisma.spinHistory.count()}`);
  }

  
  const existingUserBadgesCount = await prisma.userBadge.count();
  if (existingUserBadgesCount < 100) {
    console.log(`➕ Đang nạp UserBadges & BadgeClaims...`);
    const badgeTypes = ["SneakerHead", "VIP_Collector", "Reviewer_Pro", "Spin_Master", "Early_Bird"];
    const badgesData = [];
    const badgeClaimsData = [];

    for (let i = 0; i < existingProfiles.length; i++) {
      const userId = existingProfiles[i].id;
      const bType = badgeTypes[i % badgeTypes.length];
      badgesData.push({
        user_id: userId,
        badge_type: bType,
        quantity: getRandomInt(1, 4)
      });

      if (i < 105) {
        badgeClaimsData.push({
          user_id: userId,
          shoe_size: getRandomItem([38, 39, 40, 41, 42, 43]),
          order_id: `ORD-${getRandomInt(1000, 9999)}`,
          created_at: new Date(Date.now() - getRandomInt(1, 30) * 24 * 60 * 60 * 1000)
        });
      }
    }

    try {
      await prisma.userBadge.createMany({ data: badgesData, skipDuplicates: true });
    } catch (e) {
      console.log('UserBadges duplicate skip');
    }
    await prisma.userBadgeClaim.createMany({ data: badgeClaimsData });
    console.log(`✅ UserBadges: ${await prisma.userBadge.count()}, UserBadgeClaims: ${await prisma.userBadgeClaim.count()}`);
  }

  
  const existingNewsCount = await prisma.news.count();
  if (existingNewsCount < 100) {
    console.log(`➕ Đang bổ sung News tin tức bài viết...`);
    const newsTemplates = [
      {
        title: "Top 10 Mẫu Sneaker Bán Chạy Nhất Mùa Hè 2026 Tại ZestFoot",
        excerpt: "Khám phá danh sách 10 mẫu giày thể thao cực hot được cộng đồng yêu thời trang săn lùng nhiều nhất.",
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
        content: "Mùa hè 2026 chứng kiến sự bùng nổ của các phối màu tươi sáng. Từ Nike Air Force 1 đến Asics Gel-Kayano, ZestFoot tự hào mang tới trải nghiệm mua sắm đẳng cấp..."
      },
      {
        title: "Bí Quyết Vệ Sinh Và Bảo Quản Giày Sneaker Da Lộn Luôn Như Mới",
        excerpt: "Giày da lộn rất dễ bám bẩn nếu không biết cách chăm sóc. Cùng điểm qua các bước vệ sinh chuyên nghiệp.",
        image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600",
        content: "Chất liệu da lộn đòi hỏi sự tỉ mỉ khi làm sạch. Bạn nên dùng bàn chải chuyên dụng và dung dịch làm sạch nhẹ nhàng để giữ cho bề mặt da lộn không bị xù lông..."
      },
      {
        title: "Bộ Sưu Tập Giày Chạy Bộ Chuyên Nghiệp Mới Nhất Đã Cập Bến ZestFoot",
        excerpt: "Dành riêng cho các tín đồ yêu thích chạy bộ marathon và rèn luyện thể thao hàng ngày.",
        image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600",
        content: "Với công nghệ đệm khí tiên tiến giúp giảm chấn thương tối đa, bộ sưu tập giày chạy bộ mới hứa hẹn sẽ đồng hành cùng bạn trên mọi cung đường..."
      },
      {
        title: "Phong Cách Phối Đồ Streetwear Độc Đáo Cho Giới Trẻ Mùa Thu 2026",
        excerpt: "Gợi ý những outfit cực chất kết hợp hoàn hảo giữa quần jeans baggy và giày sneaker cổ thấp.",
        image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600",
        content: "Xu hướng streetwear thu đông năm nay đề cao sự thoải mái nhưng vẫn phải toát lên cá tính riêng. Đừng bỏ lỡ các mẫu sneaker phối màu retro mới nhất tại ZestFoot..."
      }
    ];

    const newsData = [];
    const neededNews = 105 - existingNewsCount;
    for (let i = 0; i < neededNews; i++) {
      const tpl = newsTemplates[i % newsTemplates.length];
      const idx = existingNewsCount + i + 1;
      newsData.push({
        title: `${tpl.title} (Số #${idx})`,
        excerpt: tpl.excerpt,
        image: tpl.image,
        date: `${getRandomInt(1, 28)}/08/2026`,
        content: tpl.content
      });
    }
    await prisma.news.createMany({ data: newsData });
    console.log(`✅ News sau khi nạp: ${await prisma.news.count()}`);
  }

  console.log('🎉 Hoàn tất quá trình seed dữ liệu thành công!');
}

main()
  .catch(e => console.error('❌ Lỗi seed dữ liệu:', e))
  .finally(async () => await prisma.$disconnect());
