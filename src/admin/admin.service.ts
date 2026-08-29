import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { QueryTableDto } from "./dto/query-table.dto";
import { InsertIntoTableDto } from "./dto/insert-into-table.dto";
import { UpdateTableDto } from "./dto/update-table.dto";
import { DeleteFromTableDto } from "./dto/delete-from-table.dto";
import { serializeData } from "../common/utils/db-serialization";
import { ConfigService } from "@nestjs/config";
import { AppGateway } from "../websocket/app.gateway";

import { computeMiningData } from "./helpers/mining.helper";
import {
  computeLocalDemandForecasting,
  computeLocalCustomerMlScores,
  computeLocalRecommendations,
} from "./helpers/ml.helper";
import { computeAnalytics } from "./helpers/analytics.helper";
import {
  buildCopilotSystemPrompt,
  compileCopilotContext,
  formatDemandForecast,
  formatCustomerMlScores,
  getMlFallbackTexts,
} from "./helpers/copilot.helper";

import {
  buildAutoContentPrompt,
  cleanAndParseAutoContent,
  getFallbackAutoContent,
} from "./helpers/content.helper";

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly CACHE_TTL = 3600 * 1000; 

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly appGateway: AppGateway,
  ) {}

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any) {
    this.cache.set(key, { data, expiry: Date.now() + this.CACHE_TTL });
  }

  private getModel(tableName: string): any {
    const mapping: Record<string, string> = {
      brands: "brand",
      products: "product",
      news: "news",
      orders: "order",
      profiles: "profile",
      point_transactions: "pointTransaction",
      user_vouchers: "userVoucher",
      coupons: "coupon",
      social_posts: "socialPost",
      social_comments: "socialComment",
      social_reactions: "socialReaction",
      reviews: "review",
      game_leaderboard: "gameLeaderboard",
      campaign_prizes: "campaignPrize",
      qr_tickets: "qrTicket",
      spin_history: "spinHistory",
      user_badges: "userBadge",
      user_badge_claims: "userBadgeClaim",
    };

    const modelName = mapping[tableName.toLowerCase()];
    if (!modelName || !(this.prisma as any)[modelName]) {
      throw new BadRequestException(`Không hỗ trợ bảng: ${tableName}`);
    }
    return (this.prisma as any)[modelName];
  }

  
  async queryTable(body: QueryTableDto) {
    try {
      if (!body?.table) {
        throw new BadRequestException(
          "Thiếu tên bảng (table) trong request body",
        );
      }
      const tableNameLower = body.table.toLowerCase();

      
      if (tableNameLower === "fact_sales") {
        const orders = await this.prisma.order.findMany();
        const sales = [];
        for (const order of orders) {
          const customer =
            typeof order.customer === "string"
              ? JSON.parse(order.customer)
              : order.customer;
          const items =
            typeof order.items === "string"
              ? JSON.parse(order.items)
              : order.items;

          for (const item of items || []) {
            sales.push({
              order_id: order.id.toString(),
              order_status: order.status,
              order_total_amount: Number(order.total_amount) || 0,
              order_coupon_discount: Number(order.discount) || 0,
              order_voucher_discount: Number(order.voucher_discount) || 0,
              order_point_discount: Number(order.point_discount) || 0,
              order_shipping_fee: Number(order.shipping_fee) || 0,
              order_date: order.created_at
                ? order.created_at.toISOString()
                : new Date().toISOString(),
              user_id: customer?.id || customer?.userId || null,
              customer_email: customer?.email || null,
              product_id: item.product_id ? item.product_id.toString() : null,
              product_name: item.name || item.product_name || "",
              brand: item.brand || null,
              price: Number(item.price) || 0,
              quantity: Number(item.quantity) || 1,
              size: item.size || "N/A",
              gross_revenue:
                (Number(item.price) || 0) * (Number(item.quantity) || 1),
              payment_method: order.payment_method || "cod",
            });
          }
        }
        return {
          data: sales,
          count: sales.length,
        };
      }

      if (tableNameLower === "fact_customer_engagement") {
        const pointTransactions = await this.prisma.pointTransaction.findMany();
        const engagement = pointTransactions.map((t) => ({
          event_type: t.type === "earn" ? "point_earn" : "point_spend",
          point_value: t.type === "earn" ? t.amount : -t.amount,
          user_id: t.user_id,
          reason: t.reason,
          created_at: t.created_at.toISOString(),
        }));
        return {
          data: engagement,
          count: engagement.length,
        };
      }

      if (tableNameLower === "dim_products") {
        const dbProducts = await this.prisma.product.findMany();
        const dimProducts = dbProducts.map((p) => ({
          product_id: p.id.toString(),
          name: p.name,
          brand: p.brand,
          category: p.category,
          price: p.price ? p.price.toString() : null,
          sale_price: p.salePrice ? p.salePrice.toString() : null,
        }));
        return {
          data: dimProducts,
          count: dimProducts.length,
        };
      }

      
      const model = this.getModel(body.table);
      const findOptions: any = {};

      if (body.eq) {
        const where: any = {};
        for (const [k, v] of Object.entries(body.eq)) {
          if (
            k === "price" ||
            k === "salePrice" ||
            k === "product_id" ||
            k === "id"
          ) {
            const isNumeric = /^\d+$/.test(String(v));
            if (isNumeric) {
              where[k] = BigInt(String(v));
            } else {
              where[k] = v;
            }
          } else {
            where[k] = v;
          }
        }
        findOptions.where = where;
      }

      if (body.ilike) {
        const where = findOptions.where || {};
        for (const [k, v] of Object.entries(body.ilike)) {
          const cleanPattern = v.replace(/%/g, "");
          where[k] = {
            contains: cleanPattern,
            mode: "insensitive",
          };
        }
        findOptions.where = where;
      }

      if (body.orderBy) {
        findOptions.orderBy = body.orderBy.map((order) => ({
          [order.column]: order.ascending ? "asc" : "desc",
        }));
      }

      if (body.limit !== undefined) {
        findOptions.take = body.limit;
      }
      if (body.range) {
        findOptions.skip = body.range.from;
        findOptions.take = body.range.to - body.range.from + 1;
      }

      if (
        tableNameLower === "user_vouchers" ||
        tableNameLower === "point_transactions"
      ) {
        findOptions.include = { profile: true };
      } else if (tableNameLower === "reviews") {
        findOptions.include = { product: true };
      }

      let count = null;
      if (body.countOption) {
        count = await model.count({ where: findOptions.where });
      }

      let records = [];
      if (!body.head) {
        records = await model.findMany(findOptions);
      }

      const serialized = serializeData(records);
      let finalData = serialized;

      if (
        tableNameLower === "user_vouchers" ||
        tableNameLower === "point_transactions"
      ) {
        finalData = serialized.map((r: any) => {
          const { profile, ...rest } = r;
          return {
            ...rest,
            profiles: profile,
          };
        });
      } else if (tableNameLower === "reviews") {
        finalData = serialized.map((r: any) => {
          const { product, ...rest } = r;
          return {
            ...rest,
            products: product,
          };
        });
      }

      if (body.single) {
        return {
          data: finalData[0] || null,
          count: null,
        };
      }

      return {
        data: finalData,
        count: count,
      };
    } catch (error) {
      this.logger.error(
        `Error querying table ${body?.table}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        error.message || "Lỗi truy vấn cơ sở dữ liệu.",
      );
    }
  }

  async insertIntoTable(body: InsertIntoTableDto) {
    try {
      const model = this.getModel(body.table);
      const inserted = [];
      for (const row of body.data) {
        const cleanedRow: any = {};
        for (const [k, v] of Object.entries(row)) {
          if (
            k === "price" ||
            k === "salePrice" ||
            k === "product_id" ||
            k === "id"
          ) {
            const isNumeric = /^\d+$/.test(String(v));
            if (isNumeric) {
              cleanedRow[k] = BigInt(String(v));
            } else {
              cleanedRow[k] = v;
            }
          } else {
            cleanedRow[k] = v;
          }
        }
        const record = await model.create({ data: cleanedRow });
        inserted.push(serializeData(record));
      }
      return inserted;
    } catch (error) {
      this.logger.error(
        `Error inserting into table ${body.table}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        error.message || "Lỗi nạp dữ liệu.",
      );
    }
  }

  async updateTable(body: UpdateTableDto) {
    try {
      const model = this.getModel(body.table);
      const where: any = {};
      const isNumericId = /^\d+$/.test(String(body.id));
      if (isNumericId) {
        where.id = BigInt(String(body.id));
      } else {
        where.id = body.id;
      }

      const cleanedData: any = {};
      for (const [k, v] of Object.entries(body.data)) {
        if (
          k === "price" ||
          k === "salePrice" ||
          k === "product_id" ||
          k === "id"
        ) {
          const isNumeric = /^\d+$/.test(String(v));
          if (isNumeric) {
            cleanedData[k] = BigInt(String(v));
          } else {
            cleanedData[k] = v;
          }
        } else {
          cleanedData[k] = v;
        }
      }

      const updated = await model.update({
        where,
        data: cleanedData,
      });
      return serializeData(updated);
    } catch (error) {
      this.logger.error(
        `Error updating table ${body.table} (ID ${body.id}): ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        error.message || "Lỗi cập nhật dữ liệu.",
      );
    }
  }

  async deleteFromTable(body: DeleteFromTableDto) {
    try {
      const model = this.getModel(body.table);
      const where: any = {};

      if (body.id !== undefined && body.id !== null) {
        
        const isNumericId = /^\d+$/.test(String(body.id));
        if (isNumericId) {
          where.id = BigInt(String(body.id));
        } else {
          where.id = body.id;
        }
      } else if (body.filters && Object.keys(body.filters).length > 0) {
        
        for (const [key, value] of Object.entries(body.filters)) {
          if (value !== undefined && value !== null) {
            const isNumericVal = /^\d+$/.test(String(value));
            where[key] =
              isNumericVal && typeof value !== "string"
                ? BigInt(String(value))
                : value;
          }
        }
        const deleted = await model.deleteMany({ where });
        return serializeData(deleted);
      } else {
        throw new BadRequestException(
          "Cần cung cấp id hoặc filters để xóa dữ liệu.",
        );
      }

      const deleted = await model.delete({ where });
      return serializeData(deleted);
    } catch (error) {
      this.logger.error(
        `Error deleting from table ${body.table} (ID ${body.id}): ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        error.message || "Lỗi xóa dữ liệu.",
      );
    }
  }

  
  async getMiningData() {
    const cacheKey = "mining_data";
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      this.logger.log("Returning cached mining data");
      return cached;
    }

    try {
      const [orders, reviews, products] = await Promise.all([
        this.prisma.order.findMany({
          orderBy: { created_at: "desc" },
          take: 500,
        }),
        this.prisma.review.findMany({ include: { product: true }, take: 500 }),
        this.prisma.product.findMany(),
      ]);

      const result = computeMiningData(orders, reviews, products);
      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error("Error generating data mining results:", error);
      throw new InternalServerErrorException(
        error.message || "Lỗi xử lý Data Mining.",
      );
    }
  }

  
  async copilot(messages: any[], sessionMetadata?: any) {
    const pythonUrl =
      this.configService.get<string>("PYTHON_SERVICE_URL") ||
      "http://127.0.0.1:8000";
    try {
      const [sales, engagement, vouchers, reviews] = await Promise.all([
        this.prisma.order.findMany(),
        this.prisma.pointTransaction.findMany(),
        this.prisma.userVoucher.findMany(),
        this.prisma.review.findMany({ include: { product: true } }),
      ]);

      const { kpiStatsText, gameRoiText, reviewIssuesText } =
        compileCopilotContext(sales, engagement, vouchers, reviews);

      let demandForecastText = "Chưa cấu hình dịch vụ Python ML.";
      let customerMlText = "Chưa cấu hình dịch vụ Python ML.";
      try {
        const mlRes = await fetch(`${pythonUrl}/api/ml/analytics`);
        if (mlRes.ok) {
          const mlData = await mlRes.json();
          demandForecastText = formatDemandForecast(mlData.demandForecast);
          customerMlText = formatCustomerMlScores(mlData.customerScores);
        }
      } catch (e: any) {
        this.logger.warn("Failed to contact Python ML service:", e.message);
        const fallbacks = getMlFallbackTexts();
        demandForecastText = fallbacks.demandForecastText;
        customerMlText = fallbacks.customerMlText;
      }

      const systemPrompt = buildCopilotSystemPrompt(
        kpiStatsText,
        gameRoiText,
        demandForecastText,
        customerMlText,
        reviewIssuesText,
      );
      const lastMessage = messages[messages.length - 1]?.content || "";
      const messageToSend = !sessionMetadata
        ? `${systemPrompt}\n\n[ADMIN QUESTION]:\n${lastMessage}`
        : lastMessage;

      const response = await fetch(`${pythonUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          session_metadata: sessionMetadata || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Python chat response error: ${response.statusText}`);
      }

      const pyData = await response.json();
      return {
        reply: pyData.reply,
        sessionMetadata: pyData.session_metadata,
      };
    } catch (error) {
      this.logger.error("Error running Copilot query:", error);
      throw new InternalServerErrorException(
        error.message || "Lỗi xử lý Copilot.",
      );
    }
  }

  
  async getAiHealth() {
    const pythonUrl =
      this.configService.get<string>("app.pythonServiceUrl") ||
      "http://127.0.0.1:8000";
    try {
      const res = await fetch(`${pythonUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        return await res.json();
      }
      return { status: "unhealthy", error: `FastAPI status: ${res.status}` };
    } catch (e) {
      return { status: "offline", error: e.message };
    }
  }

  
  async getMlAnalytics(email?: string, limit = 5) {
    const pythonUrl =
      this.configService.get<string>("app.pythonServiceUrl") ||
      "http://127.0.0.1:8000";
    let backendUrl = `${pythonUrl}/api/ml/analytics`;
    if (email) {
      backendUrl = `${pythonUrl}/api/ml/recommend?email=${encodeURIComponent(email)}&limit=${limit}`;
    }

    try {
      const res = await fetch(backendUrl, {
        method: "GET",
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) {
        return this.runLocalMlFallback(email, limit);
      }
      return await res.json();
    } catch (error: any) {
      this.logger.warn(
        `Python ML service offline (${error.message}). Using local fallback calculations.`,
      );
      return this.runLocalMlFallback(email, limit);
    }
  }

  private async runLocalMlFallback(email?: string, limit = 5) {
    if (email) {
      const recs = await this.getLocalRecommendations(email, limit);
      return { success: true, recommendations: recs };
    } else {
      const forecasts = await this.getLocalDemandForecasting();
      const customerScores = await this.getLocalCustomerMlScores();
      return { success: true, demandForecast: forecasts, customerScores };
    }
  }

  private async getLocalDemandForecasting() {
    const [orders, products] = await Promise.all([
      this.prisma.order.findMany({
        orderBy: { created_at: "desc" },
        take: 1000,
      }),
      this.prisma.product.findMany({ take: 1000 }),
    ]);
    return computeLocalDemandForecasting(orders, products);
  }

  private async getLocalCustomerMlScores() {
    const orders = await this.prisma.order.findMany({
      orderBy: { created_at: "desc" },
      take: 1000,
    });
    return computeLocalCustomerMlScores(orders);
  }

  private async getLocalRecommendations(userEmail: string, limit = 5) {
    const [orders, reviews, products] = await Promise.all([
      this.prisma.order.findMany({
        orderBy: { created_at: "desc" },
        take: 1000,
      }),
      this.prisma.review.findMany({
        orderBy: { created_at: "desc" },
        take: 1000,
      }),
      this.prisma.product.findMany({ take: 1000 }),
    ]);
    return computeLocalRecommendations(
      orders,
      reviews,
      products,
      userEmail,
      limit,
    );
  }

  
  async getAnalytics(brandFilter = "all") {
    const cacheKey = `analytics_data_${brandFilter.toLowerCase()}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      this.logger.log(
        `Returning cached analytics data for brand ${brandFilter}`,
      );
      return cached;
    }

    try {
      const salesRes = await this.queryTable({ table: "fact_sales" });
      const engagementRes = await this.queryTable({
        table: "fact_customer_engagement",
      });
      const dimProductsRes = await this.queryTable({ table: "dim_products" });

      const sales = salesRes.data || [];
      const engagement = engagementRes.data || [];
      const products = dimProductsRes.data || [];

      const vouchers = await this.prisma.userVoucher.findMany();
      const reviews = await this.prisma.review.findMany({
        select: {
          rating: true,
          product_id: true,
        },
      });

      const result = computeAnalytics(
        sales,
        engagement,
        products,
        vouchers,
        reviews,
        brandFilter,
      );
      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error("Error compiling analytics:", error);
      throw new InternalServerErrorException(
        error.message || "Lỗi xử lý thống kê analytics.",
      );
    }
  }

  
  async autoContent() {
    
    this.logger.log(
      "Starting AI Auto Marketing Content generation in background...",
    );
    setTimeout(() => {
      this.runAutoContentInBackground().catch((err) => {
        this.logger.error("Background auto-content generation failed:", err);
      });
    }, 0);

    return {
      success: true,
      pending: true,
      message:
        "Hệ thống AI đang khởi chạy viết bài và tạo ảnh ngầm. Kết quả sẽ được cập nhật và gửi thông báo qua WebSockets sau vài giây.",
    };
  }

  private async runAutoContentInBackground() {
    try {
      const products = await this.prisma.product.findMany();
      if (!products || products.length === 0) {
        throw new Error("Không tìm thấy sản phẩm nào trong cửa hàng.");
      }

      let candidates = products.filter(
        (p) =>
          p.category === "shoes" &&
          p.name &&
          p.image &&
          (p.isTrending === true || p.isNew === true || p.isSale === true),
      );

      if (candidates.length === 0) {
        candidates = products.filter(
          (p) => p.category === "shoes" && p.name && p.image,
        );
      }

      if (candidates.length === 0) {
        candidates = products.filter((p) => p.name && p.image);
      }

      const product = candidates[Math.floor(Math.random() * candidates.length)];

      const coupons = await this.prisma.coupon.findMany({
        where: { is_active: true },
      });

      let couponText = "";
      if (coupons && coupons.length > 0) {
        couponText = coupons
          .map(
            (c) =>
              `Mã "${c.code}" (${
                c.discount_type === "percent"
                  ? `${c.discount_value}%`
                  : `${Number(c.discount_value).toLocaleString("vi-VN")}đ`
              }${c.min_order_value ? `, đơn tối thiểu ${Number(c.min_order_value).toLocaleString("vi-VN")}đ` : ""})`,
          )
          .join(", ");
      }

      let userId: string | null = null;
      const adminProfile = await this.prisma.profile.findFirst({
        where: {
          full_name: {
            contains: "admin",
            mode: "insensitive",
          },
        },
      });

      if (adminProfile) {
        userId = adminProfile.id;
      } else {
        const anyProfile = await this.prisma.profile.findFirst();
        if (anyProfile) {
          userId = anyProfile.id;
        }
      }

      if (!userId) {
        throw new Error(
          "Không tìm thấy profile người dùng nào để đăng bài trên cộng đồng.",
        );
      }

      const prompt = buildAutoContentPrompt(product, couponText);

      let aiContent: any = null;
      let generatedImage: string | null = null;

      const pythonUrl =
        this.configService.get<string>("app.pythonServiceUrl") ||
        "http://127.0.0.1:8000";
      try {
        const response = await fetch(`${pythonUrl}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: prompt,
            session_metadata: null,
          }),
        });

        if (response.ok) {
          const pyData = await response.json();
          const responseText = (pyData.reply || "").trim();
          generatedImage = pyData.generated_image || null;
          aiContent = cleanAndParseAutoContent(responseText);
        }
      } catch (e: any) {
        this.logger.warn(
          `Python AI service is offline or returned error: ${e.message}`,
        );
      }

      if (!aiContent) {
        aiContent = getFallbackAutoContent(product);
      }

      const postImage =
        generatedImage ||
        product.image ||
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600";
      const currentDate = new Date().toISOString().split("T")[0];

      const newBlog = await this.prisma.news.create({
        data: {
          title: aiContent.blog_title,
          excerpt: aiContent.blog_excerpt,
          content: aiContent.blog_content,
          image: postImage,
          date: currentDate,
        },
      });

      const socialPost = await this.prisma.socialPost.create({
        data: {
          user_id: userId,
          caption: aiContent.social_caption,
          image: postImage,
        },
      });

      const result = {
        success: true,
        blog: {
          ...newBlog,
          id: newBlog.id.toString(),
        },
        social: {
          ...socialPost,
          id: socialPost.id,
        },
      };

      this.logger.log(
        "AI Auto Marketing Content generated successfully. Broadcasting update...",
      );
      this.appGateway.server.emit("autoContentCreated", result);
    } catch (error: any) {
      this.logger.error(
        "Background auto-content generation failed:",
        error.message,
      );
      this.appGateway.server.emit("autoContentCreated", {
        success: false,
        error: error.message || "Lỗi tự động tạo bài viết.",
      });
    }
  }

  
  async getSmartPricing() {
    try {
      const [products, orders, reviews] = await Promise.all([
        this.prisma.product.findMany(),
        this.prisma.order.findMany({ take: 1000, orderBy: { created_at: "desc" } }),
        this.prisma.review.findMany({ take: 1000 }),
      ]);

      
      const unitsSoldMap = new Map<string, number>();
      for (const order of orders) {
        const items = Array.isArray(order.items) ? (order.items as any[]) : [];
        for (const item of items) {
          const pid = String(item.product?.id || item.id || item.productId || "");
          if (pid) {
            unitsSoldMap.set(pid, (unitsSoldMap.get(pid) || 0) + (Number(item.quantity) || 1));
          }
        }
      }

      
      const ratingMap = new Map<string, { sum: number; count: number }>();
      for (const review of reviews) {
        if (review.product_id) {
          const pid = review.product_id.toString();
          const cur = ratingMap.get(pid) || { sum: 0, count: 0 };
          cur.sum += Number(review.rating) || 5;
          cur.count += 1;
          ratingMap.set(pid, cur);
        }
      }

      let totalGrossRevenue = 0;
      let totalCostPrice = 0;
      let totalDiscountsGiven = 0;

      const marginReportList = products.map((p) => {
        const idStr = p.id.toString();
        const price = Number(p.price || 1500000);
        const salePrice = p.salePrice ? Number(p.salePrice) : price;
        
        const costPrice = p.costPrice ? Number(p.costPrice) : Math.round(price * 0.65);
        const minMarginPercent = 15;

        
        let unitsSold = unitsSoldMap.get(idStr) || 0;
        if (unitsSold === 0) {
          unitsSold = (p.isTrending ? 8 : (p.isSale ? 5 : 2)) + (Number(p.id) % 4);
        }

        const grossRev = unitsSold * salePrice;
        const totalCost = unitsSold * costPrice;
        const promoCost = unitsSold * Math.max(0, price - salePrice);
        const netProfit = grossRev - totalCost;
        const marginPercent = grossRev > 0 ? Math.round((netProfit / grossRev) * 100) : 0;

        const ratingObj = ratingMap.get(idStr);
        const avgRating = ratingObj ? Number((ratingObj.sum / ratingObj.count).toFixed(1)) : 4.6;

        const isStar = (unitsSold >= 5 && avgRating >= 4.0) || p.isTrending;
        const isClog = (unitsSold <= 2 && (p.isSale || marginPercent < 20)) && !isStar;

        totalGrossRevenue += grossRev;
        totalCostPrice += totalCost;
        totalDiscountsGiven += promoCost;

        return {
          id: Number(p.id),
          name: p.name,
          brand: p.brand || "ZestFoot",
          image: p.image || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300",
          price,
          salePrice,
          costPrice,
          minMarginPercent,
          unitsSold,
          grossRev,
          totalCost,
          promoCost,
          netProfit,
          marginPercent,
          avgRating,
          isClog,
          isStar,
        };
      });

      
      marginReportList.sort((a, b) => b.grossRev - a.grossRev);

      let clogProducts = marginReportList.filter((p) => p.isClog);
      if (clogProducts.length === 0) {
        clogProducts = marginReportList.slice(-4);
      }

      let starProducts = marginReportList.filter((p) => p.isStar);
      if (starProducts.length === 0) {
        starProducts = marginReportList.slice(0, 4);
      }

      const totalNetProfit = totalGrossRevenue - totalCostPrice - totalDiscountsGiven;
      const overallMarginPercent =
        totalGrossRevenue > 0
          ? Math.round((totalNetProfit / totalGrossRevenue) * 100)
          : 28;

      return {
        success: true,
        summary: {
          totalGrossRevenue,
          totalCostPrice,
          totalDiscountsGiven,
          totalNetProfit,
          overallMarginPercent,
        },
        marginReportList,
        clogProducts,
        starProducts,
      };
    } catch (error: any) {
      this.logger.error("Error computing smart pricing data:", error.message, error.stack);
      throw new InternalServerErrorException(error.message || "Lỗi xử lý Smart Pricing.");
    }
  }

  async handleSmartPricingAction(body: { action: string; productId: number; newSalePrice?: number; surgePercent?: number }) {
    try {
      const { action, productId, newSalePrice, surgePercent } = body;
      const product = await this.prisma.product.findUnique({
        where: { id: BigInt(productId) },
      });

      if (!product) {
        throw new NotFoundException(`Không tìm thấy sản phẩm #${productId}`);
      }

      if (action === "apply_clearance") {
        const updatePrice = newSalePrice || Math.round(Number(product.costPrice || (Number(product.price) * 0.65)) * 1.15);
        await this.prisma.product.update({
          where: { id: BigInt(productId) },
          data: {
            salePrice: BigInt(updatePrice),
            isSale: true,
          },
        });
        return {
          success: true,
          message: `Đã áp dụng giá xả hàng tồn kho (${updatePrice.toLocaleString("vi-VN")} đ) cho sản phẩm ${product.name}!`,
        };
      }

      if (action === "apply_surge") {
        const currentPrice = Number(product.salePrice || product.price);
        const percent = surgePercent || 5;
        const newSurgePrice = Math.round(currentPrice * (1 + percent / 100));
        await this.prisma.product.update({
          where: { id: BigInt(productId) },
          data: {
            salePrice: BigInt(newSurgePrice),
          },
        });
        return {
          success: true,
          message: `Đã áp dụng Surge Pricing (+${percent}%) lên ${newSurgePrice.toLocaleString("vi-VN")} đ cho sản phẩm ${product.name}!`,
        };
      }

      return { success: true, message: "Thao tác hoàn tất." };
    } catch (error: any) {
      this.logger.error("Error executing smart pricing action:", error.message);
      throw new InternalServerErrorException(error.message || "Lỗi cập nhật giá sản phẩm.");
    }
  }
}
