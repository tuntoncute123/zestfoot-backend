import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PrismaService } from '../database/prisma.service';
import { GetProductsQuery } from './queries/impl/get-products.query';
import { GetProductByIdQuery } from './queries/impl/get-product-by-id.query';
import { GetProductsByCollectionQuery } from './queries/impl/get-products-by-collection.query';
import { SearchProductsQuery } from './queries/impl/search-products.query';
import { CreateProductCommand } from './commands/impl/create-product.command';
import { CreateProductDto } from './dto/create-product.dto';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../common/redis.service';
import { analyzeReviewSentiment, generateSentimentSummary } from './helpers/sentiment.helper';
import { validatePublicCoupon, validatePrivateVoucher } from './helpers/coupon.helper';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  // --- PRODUCTS ---
  async getAllProducts(params?: {
    limit?: number;
    offset?: number;
    brand?: string;
    category?: string;
    gender?: string;
    isNew?: boolean;
    isSale?: boolean;
    isTrending?: boolean;
    isAsicsExclusive?: boolean;
  }) {
    const cacheKey = `cache:products:all:${JSON.stringify(params || {})}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      this.logger.log(`Hit Redis cache for products list: ${cacheKey}`);
      return cached;
    }

    const products = await this.queryBus.execute(new GetProductsQuery(
      params?.limit,
      params?.offset,
      params?.brand,
      params?.category,
      params?.gender,
      params?.isNew,
      params?.isSale,
      params?.isTrending,
      params?.isAsicsExclusive,
    ));
    if (products) {
      await this.redisService.set(cacheKey, products, 60);
    }
    return products;
  }

  async searchProducts(q: string) {
    return this.queryBus.execute(new SearchProductsQuery(q));
  }

  async getProductsByCollection(slug: string) {
    return this.queryBus.execute(new GetProductsByCollectionQuery(slug));
  }

  async getProductByIdOrSlug(idOrSlug: string) {
    return this.queryBus.execute(new GetProductByIdQuery(idOrSlug));
  }

  async createProduct(dto: CreateProductDto) {
    const result = await this.commandBus.execute(new CreateProductCommand(dto));
    await this.redisService.del('cache:products:all:all:0');
    return result;
  }

  async getBrands() {
    const cacheKey = 'cache:brands:all';
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      this.logger.log(`Hit Redis cache for brands list`);
      return cached;
    }

    try {
      const brands = await this.prisma.brand.findMany();
      const formatted = brands.map(b => ({
        ...b,
        id: b.id.toString(),
      }));
      await this.redisService.set(cacheKey, formatted, 120); // 120s TTL
      return formatted;
    } catch (error) {
      this.logger.error(`Lỗi khi lấy danh sách thương hiệu: ${error.message}`, error.stack);
      throw error;
    }
  }

  // --- NEWS ---
  async getAllNews() {
    try {
      const news = await this.prisma.news.findMany();
      return news.map(item => ({
        ...item,
        id: item.id.toString(),
      }));
    } catch (error) {
      this.logger.error(`Lỗi khi lấy danh sách bài viết: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getNewsById(id: string) {
    try {
      const item = await this.prisma.news.findUnique({
        where: { id: BigInt(id) },
      });

      if (!item) {
        throw new NotFoundException(`News article with ID ${id} not found`);
      }

      return {
        ...item,
        id: item.id.toString(),
      };
    } catch (error) {
      this.logger.error(`Lỗi khi lấy chi tiết bài viết (ID ${id}): ${error.message}`, error.stack);
      throw error;
    }
  }

  // --- REVIEWS ---
  async getReviews(productId?: string, sentiment?: string) {
    try {
      const where: any = {};
      if (productId) {
        where.product_id = BigInt(productId);
      }
      if (sentiment) {
        where.sentiment = sentiment;
      }

      const reviews = await this.prisma.review.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: {
          product: {
            select: {
              name: true,
              brand: true,
              image: true,
            },
          },
        },
      });

      return reviews.map(r => ({
        ...r,
        id: r.id.toString(),
        product_id: r.product_id ? r.product_id.toString() : null,
        products: r.product,
      }));
    } catch (error) {
      this.logger.error(`Lỗi khi lấy danh sách đánh giá: ${error.message}`, error.stack);
      throw error;
    }
  }

  async createReview(body: {
    product_id: string;
    rating: number;
    title: string;
    content: string;
    display_name: string;
    email?: string;
    avatar?: string;
    sentiment?: string;
    sentiment_score?: number;
    sentiment_explanation?: string;
  }) {
    try {
      // Default values / Fallback for Sentiment Analysis
      let sentiment = body.sentiment || 'neutral';
      let sentimentScore = body.sentiment_score ?? 50;
      let sentimentExplanation = body.sentiment_explanation || 'Không thể phân tích bằng AI, tự động xếp loại dựa trên số sao đánh giá.';

      if (!body.sentiment || body.sentiment_score === undefined) {
        if (body.rating >= 4) {
          sentiment = 'positive';
          sentimentScore = body.rating === 5 ? 90 : 75;
        } else if (body.rating <= 2) {
          sentiment = 'negative';
          sentimentScore = body.rating === 1 ? 10 : 30;
        }

        const aiResult = await analyzeReviewSentiment({
          rating: body.rating,
          title: body.title,
          content: body.content,
        });

        if (aiResult) {
          sentiment = aiResult.sentiment;
          sentimentScore = aiResult.sentiment_score;
          sentimentExplanation = aiResult.sentiment_explanation;
        }
      }

      const review = await this.prisma.review.create({
        data: {
          product_id: BigInt(body.product_id),
          rating: body.rating,
          title: body.title,
          content: body.content,
          display_name: body.display_name,
          email: body.email || null,
          avatar: body.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
          sentiment,
          sentiment_score: sentimentScore,
          sentiment_explanation: sentimentExplanation,
        },
        include: {
          product: {
            select: {
              name: true,
              brand: true,
              image: true,
            },
          },
        },
      });

      return {
        ...review,
        id: review.id.toString(),
        product_id: review.product_id ? review.product_id.toString() : null,
        products: review.product,
      };
    } catch (error) {
      this.logger.error(`Lỗi khi tạo đánh giá sản phẩm (ID ${body.product_id}): ${error.message}`, error.stack);
      throw error;
    }
  }

  async getSentimentSummary() {
    try {
      const reviews = await this.prisma.review.findMany({
        take: 50,
        orderBy: { created_at: 'desc' },
        select: {
          rating: true,
          title: true,
          content: true,
          sentiment: true,
        },
      });

      if (!reviews || reviews.length === 0) {
        return {
          praises: ['Chưa có đánh giá nào từ khách hàng.'],
          complaints: ['Chưa có phản hồi tiêu cực nào để phân tích.'],
          recommendations: ['Khuyến khích khách hàng đánh giá nhiều hơn để thu thập dữ liệu cải tiến.']
        };
      }

      const defaultSummary = {
        praises: [
          'Giày chạy bộ (như Asics) được đánh giá rất cao về độ êm ái và bám đường.',
          'Dịch vụ đóng gói cẩn thận hai lớp và giao hàng nhanh chóng.',
          'Kiểu dáng giày nữ xinh xắn, dễ phối đồ hàng ngày.'
        ],
        complaints: [
          'Một số giày làm bằng da có phom hơi cứng, cọ xát gây đau gót chân trong thời gian đầu.',
          'Xảy ra trường hợp giao nhầm size giày so với đơn đặt hàng của khách.',
          'Hộp giày bên ngoài bị móp méo trong quá trình vận chuyển.'
        ],
        recommendations: [
          'Tăng cường khâu kiểm tra size giày trước khi đóng gói gửi đi.',
          'Làm việc với đơn vị vận chuyển để bảo vệ hộp giày nguyên vẹn, hoặc bọc thêm xốp chống sốc dày hơn.',
          'Khuyên khách hàng tăng 0.5 size đối với các mẫu giày có phom ôm sát hoặc chân bè.'
        ]
      };

      try {
        return await generateSentimentSummary(reviews, defaultSummary);
      } catch (err) {
        this.logger.warn(`AI sentiment summary fallback used: ${err.message}`);
        return defaultSummary;
      }
    } catch (error) {
      this.logger.error('Error fetching/summarizing reviews sentiment:', error);
      return {
        praises: ['Giày chạy bộ (như Asics) được đánh giá rất cao về độ êm ái và bám đường.'],
        complaints: ['Một số giày làm bằng da có phom hơi cứng trong thời gian đầu.'],
        recommendations: ['Tăng cường khâu kiểm tra size giày trước khi đóng gói gửi đi.']
      };
    }
  }

  async deleteReview(id: string) {
    try {
      const existing = await this.prisma.review.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      await this.prisma.review.delete({
        where: { id },
      });

      return { success: true, message: 'Đã xóa đánh giá thành công.' };
    } catch (error) {
      this.logger.error(`Lỗi khi xóa đánh giá (ID ${id}): ${error.message}`, error.stack);
      throw error;
    }
  }

  // --- COUPONS ---
  async validateCoupon(code: string, orderTotal: number, userId?: string) {
    try {
      if (!code) {
        throw new BadRequestException('Mã giảm giá không được để trống.');
      }

      const upperCode = code.toUpperCase().trim();

      // 1. Check Public Coupon
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: upperCode },
      });

      if (coupon) {
        const validationResult = validatePublicCoupon(coupon, orderTotal);
        if (validationResult.valid || validationResult.message !== 'Mã giảm giá không hoạt động.') {
          return validationResult;
        }
      }

      // 2. Check User Vouchers (Private)
      if (userId) {
        const voucher = await this.prisma.userVoucher.findFirst({
          where: {
            code: upperCode,
            user_id: userId,
            status: 'active',
          },
        });

        if (voucher) {
          return validatePrivateVoucher(voucher, orderTotal);
        }
      }

      return { valid: false, message: 'Mã giảm giá không tồn tại hoặc đã hết hạn.' };
    } catch (error) {
      this.logger.error(`Lỗi khi kiểm tra mã giảm giá ${code}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async useCoupon(code: string) {
    try {
      if (!code) {
        throw new BadRequestException('Mã coupon không được trống');
      }

      const upperCode = code.toUpperCase().trim();
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: upperCode },
      });

      if (coupon) {
        await this.prisma.coupon.update({
          where: { code: upperCode },
          data: {
            used_count: (coupon.used_count || 0) + 1,
          },
        });
        return { success: true };
      }

      throw new NotFoundException('Không tìm thấy coupon');
    } catch (error) {
      this.logger.error(`Lỗi khi sử dụng mã giảm giá ${code}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAllCoupons() {
    try {
      const coupons = await this.prisma.coupon.findMany({
        orderBy: { created_at: 'desc' },
      });
      return coupons.map(c => ({
        ...c,
        id: c.id.toString(),
        discountValue: Number(c.discount_value),
        discount_value: Number(c.discount_value),
        minOrderValue: Number(c.min_order_value || 0),
        min_order_value: Number(c.min_order_value || 0),
        maxDiscountAmount: Number(c.max_discount_amount || 0),
        max_discount_amount: Number(c.max_discount_amount || 0),
        startDate: c.start_date,
        start_date: c.start_date,
        endDate: c.end_date,
        end_date: c.end_date,
        usageLimit: c.usage_limit,
        usage_limit: c.usage_limit,
        usedCount: c.used_count,
        used_count: c.used_count,
        isActive: c.is_active,
        is_active: c.is_active,
        discountType: c.discount_type,
        discount_type: c.discount_type,
      }));
    } catch (error) {
      this.logger.error(`Lỗi khi lấy danh sách coupons: ${error.message}`, error.stack);
      throw error;
    }
  }

  async createCoupon(data: any) {
    try {
      const code = data.code.toUpperCase().trim();
      const discountType = data.discountType || data.discount_type || 'fixed';
      const discountValue = Number(data.discountValue !== undefined ? data.discountValue : (data.discount_value || 0));
      const minOrderValue = Number(data.minOrderValue !== undefined ? data.minOrderValue : (data.min_order_value || 0));
      const maxDiscountAmount = Number(data.maxDiscountAmount !== undefined ? data.maxDiscountAmount : (data.max_discount_amount || 0));
      const usageLimit = Number(data.usageLimit !== undefined ? data.usageLimit : (data.usage_limit !== undefined ? data.usage_limit : 100));
      const startDate = data.startDate || data.start_date ? new Date(data.startDate || data.start_date) : null;
      const endDate = data.endDate || data.end_date ? new Date(data.endDate || data.end_date) : null;
      const isActive = data.isActive !== undefined ? Boolean(data.isActive) : (data.is_active !== undefined ? Boolean(data.is_active) : true);

      const coupon = await this.prisma.coupon.create({
        data: {
          code,
          discount_type: discountType,
          discount_value: discountValue,
          min_order_value: minOrderValue,
          max_discount_amount: maxDiscountAmount,
          usage_limit: usageLimit,
          used_count: 0,
          is_active: isActive,
          start_date: startDate,
          end_date: endDate,
        },
      });

      return {
        ...coupon,
        id: coupon.id.toString(),
        discountValue: Number(coupon.discount_value),
        minOrderValue: Number(coupon.min_order_value || 0),
        maxDiscountAmount: Number(coupon.max_discount_amount || 0),
      };
    } catch (error) {
      this.logger.error(`Lỗi khi tạo coupon mới: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteCoupon(id: string) {
    try {
      await this.prisma.coupon.delete({
        where: { id: BigInt(id) },
      });
      return { success: true };
    } catch (error) {
      this.logger.error(`Lỗi khi xóa coupon (ID ${id}): ${error.message}`, error.stack);
      throw error;
    }
  }

  async incrementViews(id: string) {
    try {
      const pId = BigInt(id);
      await this.prisma.product.update({
        where: { id: pId },
        data: { viewsCount: { increment: 1 } },
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  async getRecommendedCombo(id: string) {
    try {
      const pId = BigInt(id);
      const mainProduct = await this.prisma.product.findUnique({ where: { id: pId } });
      if (!mainProduct) return [];

      // Tìm sản phẩm mua kèm (ưu tiên phụ kiện hoặc khác danh mục)
      const accessories = await this.prisma.product.findMany({
        where: {
          id: { not: pId },
          category: { not: mainProduct.category || 'shoes' }
        },
        take: 2
      });

      if (accessories.length === 0) {
        const fallback = await this.prisma.product.findMany({
          where: { id: { not: pId } },
          take: 2
        });
        return fallback.map(p => ({
          ...p,
          id: p.id.toString(),
          price: Number(p.price || 0),
          salePrice: Number(p.salePrice || 0)
        }));
      }

      return accessories.map(p => ({
        ...p,
        id: p.id.toString(),
        price: Number(p.price || 0),
        salePrice: Number(p.salePrice || 0)
      }));
    } catch (error) {
      this.logger.error(`Lỗi khi gợi ý combo cho sản phẩm ${id}: ${error.message}`);
      return [];
    }
  }
}
