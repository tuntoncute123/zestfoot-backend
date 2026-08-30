import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import OpenAI from 'openai';
import { parseVoiceText } from './helpers/voice.helper';
import {
  formatPrice,
  retrieveRelevantProductsKeyword,
  reciprocalRankFusion,
  enrichWithGraphRelations,
  evaluateRetrieval,
  rewriteQuery,
  buildFallbackReply,
} from './helpers/rag.helper';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;
  private cachedProducts: any[] | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const ollamaUrl = this.configService.get<string>('app.ollamaBaseUrl') || 'http://localhost:11434';
    this.openai = new OpenAI({
      apiKey: 'ollama',
      baseURL: `${ollamaUrl}/v1`,
    });
    this.logger.log(`AiService initialized with local Ollama at ${ollamaUrl}/v1 (model: qwen2.5:3b)`);
  }

  
  async chat(message: string, sessionMetadata?: any[], userImageBase64?: string, shoeImageBase64?: string) {
    const pythonUrl = this.configService.get<string>('app.pythonServiceUrl');
    try {
      const response = await fetch(`${pythonUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          session_metadata: sessionMetadata || null,
          user_image_base64: userImageBase64 || null,
          shoe_image_base64: shoeImageBase64 || null,
        }),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (_) {
      // Fallback directly to local Ollama qwen2.5:3b
    }

    try {
      const chatModel = this.configService.get<string>('app.ollamaModel') || 'qwen2.5:3b';
      const completion = await this.openai.chat.completions.create({
        model: chatModel,
        messages: [
          { role: 'system', content: 'Bạn là trợ lý AI tư vấn bán hàng của ZestFoot. Trả lời thân thiện, ngắn gọn bằng tiếng Việt.' },
          { role: 'user', content: message || 'Xin chào!' }
        ],
        temperature: 0.7,
      });

      return {
        reply: completion.choices?.[0]?.message?.content || 'Xin chào! Tôi có thể giúp gì cho bạn về sản phẩm ZestFoot?',
      };
    } catch (err) {
      this.logger.error('Error calling local Ollama in chat fallback:', err);
      return {
        reply: 'Xin chào! Tôi là trợ lý AI ZestFoot (Model Qwen2.5 Local). Bạn cần tư vấn sản phẩm gì hôm nay?',
      };
    }
  }

  
  async chatRag(message?: string, userContext?: any) {
    try {
      const rawMessage = typeof message === 'string' ? message.trim() : '';
      if (!rawMessage) {
        return {
          reply: 'Xin chào! Tôi là trợ lý AI ZestFoot. Bạn cần tư vấn sản phẩm, kiểm tra đơn hàng hay chính sách gì hôm nay?',
        };
      }

      if (!this.cachedProducts || this.cachedProducts.length === 0) {
        try {
          const dbProducts = await this.prisma.product.findMany();
          this.cachedProducts = dbProducts.map((p) => ({
            ...p,
            id: Number(p.id),
            price: p.price ? Number(p.price) : null,
            salePrice: p.salePrice ? Number(p.salePrice) : null,
          }));
        } catch (err) {
          this.logger.error('Error loading products for RAG:', err);
          this.cachedProducts = [];
        }
      }

      const normalized = rawMessage.toLowerCase();
      const tools: string[] = [];
      const searchQuery = rawMessage;

      const isOrderQuery =
        normalized.includes('đơn hàng') ||
        normalized.includes('mã vận đơn') ||
        normalized.includes('giao chưa') ||
        normalized.includes('lịch sử mua') ||
        normalized.includes('trạng thái');
      const isPointsQuery =
        normalized.includes('điểm') ||
        normalized.includes('xu') ||
        normalized.includes('tích lũy') ||
        normalized.includes('hạng') ||
        normalized.includes('membership');
      const isPolicyQuery =
        normalized.includes('đổi trả') ||
        normalized.includes('size') ||
        normalized.includes('kích cỡ') ||
        normalized.includes('thanh toán') ||
        normalized.includes('momo') ||
        normalized.includes('vnpay') ||
        normalized.includes('ship') ||
        normalized.includes('địa chỉ') ||
        normalized.includes('cửa hàng');

      if (isOrderQuery) {
        tools.push(userContext?.email ? 'customer_orders_check' : 'ask_login');
      }
      if (isPointsQuery) {
        tools.push(userContext?.id ? 'customer_points_check' : 'ask_login');
      }
      if (isPolicyQuery) {
        tools.push('store_policies_search');
      }

      const shoeKeywords = [
        'giày', 'sneaker', 'nike', 'adidas', 'puma', 'jordan', 'vans', 'converse',
        'hãng', 'bán chạy', 'sale', 'new', 'mới', 'giá', 'đồng', 'đôi', 'bóng rổ', 'chạy bộ',
      ];
      const matchesShoe = shoeKeywords.some((kw) => normalized.includes(kw));

      if (matchesShoe || tools.length === 0) {
        tools.push('product_catalog_search');
      }

      let contextText = '';
      let matchedProducts: any[] = [];
      let needsLoginMessage = false;

      const VND_FORMATTER = new Intl.NumberFormat('vi-VN');
      const STORE_KNOWLEDGE_BASE = `Thông tin chung của cửa hàng:
- Giao hàng: Nội thành 1-2 ngày, tỉnh thành khác 3-5 ngày. Phí ship đồng giá 30.000đ, miễn phí cho đơn hàng từ 1.000.000đ.
- Thanh toán: Hỗ trợ nhận hàng thanh toán (COD), quét mã QR Chuyển khoản, và Ví điện tử MoMo / VNPAY.
- Đổi trả: Hỗ trợ đổi size/mẫu trong vòng 7 ngày kể từ khi nhận hàng. Yêu cầu sản phẩm chưa qua sử dụng, còn nguyên tem mác và hộp giày.
- Size giày: Có bảng quy đổi US/UK/CM đính kèm bên cạnh mỗi sản phẩm.`;

      for (const tool of tools) {
        try {
          if (tool === 'customer_orders_check' && userContext?.email) {
            const allOrders = await this.prisma.order.findMany({
              orderBy: { created_at: 'desc' },
            });
            const userOrders = allOrders
              .filter((o) => {
                let customerObj = o.customer;
                if (typeof customerObj === 'string') {
                  try {
                    customerObj = JSON.parse(customerObj);
                  } catch {
                    customerObj = null;
                  }
                }
                return customerObj && typeof customerObj === 'object' && (customerObj as any).email === userContext.email;
              })
              .slice(0, 3);

            let orderText = '';
            if (userOrders.length > 0) {
              orderText = userOrders
                .map(
                  (o) =>
                    `- Đơn hàng #${o.id}: Trạng thái [${o.status}], Tổng cộng: ${
                      o.total_amount ? VND_FORMATTER.format(Number(o.total_amount)) : '0'
                    }đ, Ngày tạo: ${new Date(o.created_at).toLocaleDateString('vi-VN')}`,
                )
                .join('\n');
            } else {
              orderText = 'Không tìm thấy đơn hàng nào gần đây của bạn.';
            }
            contextText += `\n\n[CONTEXT: Lịch sử đơn hàng của khách hàng ${userContext.name || ''}]:\n${orderText}`;
          } else if (tool === 'customer_points_check' && userContext?.id) {
            const profile = await this.prisma.profile.findUnique({
              where: { id: userContext.id },
            }).catch(() => null);
            const txs = await this.prisma.pointTransaction.findMany({
              where: { user_id: userContext.id },
              orderBy: { created_at: 'desc' },
              take: 3,
            }).catch(() => []);

            const points = profile?.points || 0;
            let txText = 'Chưa có lịch sử tích điểm.';
            if (txs && txs.length > 0) {
              txText = txs
                .map(
                  (t) =>
                    `- ${t.amount > 0 ? '+' : ''}${t.amount} Xu: ${t.reason} (${new Date(
                      t.created_at,
                    ).toLocaleDateString('vi-VN')})`,
                )
                .join('\n');
            }
            contextText += `\n\n[CONTEXT: Điểm tích lũy thành viên của ${userContext.name || ''}]:\nSố dư: ${points} Xu (Tương đương ${VND_FORMATTER.format(
              points * 1000,
            )}đ).\nLịch sử giao dịch:\n${txText}`;
          } else if (tool === 'ask_login') {
            needsLoginMessage = true;
          } else if (tool === 'store_policies_search') {
            contextText += `\n\n[CONTEXT: Chính sách cửa hàng]:\n${STORE_KNOWLEDGE_BASE}`;
          } else if (tool === 'product_catalog_search') {
            let vectorRes: any[] = [];

            const keywordRes = retrieveRelevantProductsKeyword(searchQuery, this.cachedProducts || []);
            let fused = reciprocalRankFusion(vectorRes, keywordRes);

            let grade = evaluateRetrieval(searchQuery, fused);
            if (grade === 'AMBIGUOUS' && this.openai) {
              try {
                const chatModel = this.configService.get<string>('app.ollamaModel') || 'qwen2.5:3b';
                const rewritten = await rewriteQuery(this.openai, chatModel, searchQuery);
                const vectorRes2 = (await this.retrieveContextWithVector(rewritten)) || [];
                const keywordRes2 = retrieveRelevantProductsKeyword(rewritten, this.cachedProducts || []);
                fused = reciprocalRankFusion(vectorRes2, keywordRes2);
              } catch (_) {
                // Keep existing fused if rewriting fails
              }
            } else if (grade === 'INCORRECT') {
              fused = [];
            }

            matchedProducts = enrichWithGraphRelations(fused.slice(0, 4), this.cachedProducts || []);

            if (matchedProducts.length > 0) {
              const productText = matchedProducts
                .map(
                  (p) =>
                    `- Tên: ${p.name}\n  ID: ${p.id}\n  Hãng: ${p.brand || 'ZestFoot'}\n  Ảnh: ${p.image || ''}\n  Giá: ${formatPrice(
                      p.salePrice || p.price,
                    )}\n  Phân loại: ${p.category || 'Sneaker'}${p.graphRelation ? `\n  Liên kết: ${p.graphRelation}` : ''}`,
                )
                .join('\n\n');
              contextText += `\n\n[CONTEXT: Danh mục sản phẩm đề xuất]:\n${productText}`;
            } else {
              contextText += `\n\n[CONTEXT: Danh mục sản phẩm đề xuất]: Không tìm thấy sản phẩm nào khớp hoàn toàn với yêu cầu hiện tại.`;
            }
          }
        } catch (toolErr) {
          this.logger.error(`Error executing tool ${tool}:`, toolErr);
        }
      }

      if (needsLoginMessage) {
        contextText += `\n\n[CONTEXT: Cảnh báo]: Khách hàng chưa đăng nhập vào tài khoản. Hãy nhắc khách đăng nhập để kiểm tra thông tin cá nhân.`;
      }

      if (!this.openai) {
        return { reply: buildFallbackReply(matchedProducts, isPolicyQuery ? STORE_KNOWLEDGE_BASE : undefined) };
      }

      try {
        const SYSTEM_PROMPT = `Bạn là trợ lý AI tư vấn bán hàng chuyên nghiệp của cửa hàng giày ZestFoot (HKT-Shoes).
Nhiệm vụ của bạn:
1. Dựa vào [CONTEXT] dữ liệu sản phẩm, đơn hàng, điểm tích lũy hoặc chính sách cửa hàng được cung cấp để trả lời CHÍNH XÁC, ĐÚNG TRỌNG TÂM câu hỏi của khách hàng.
2. Trả lời thân thiện, lịch sự, ngắn gọn bằng tiếng Việt.
3. Khi đề xuất sản phẩm từ [CONTEXT], hãy giới thiệu từ 2 đến 4 đôi giày phù hợp nhất và LUÔN LUÔN định dạng Markdown chuẩn:
   ![Tên sản phẩm](URL_ẢNH)
   👉 **[Tên sản phẩm](/products/ID_SẢN_PHẨM)** - Giá: GIÁ_TIỀN (Hãng: TÊN_HÃNG)
4. Nếu khách hàng hỏi về đơn hàng hoặc điểm tích lũy mà context báo khách chưa đăng nhập, hãy hướng dẫn khách đăng nhập để kiểm tra thông tin cá nhân.
5. Tuyệt đối không bịa đặt sản phẩm không có trong CONTEXT.`;

        const messages: any[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: `Dưới đây là thông tin chung của cửa hàng:\n${STORE_KNOWLEDGE_BASE}` },
        ];

        messages.push({ role: 'user', content: `${contextText}\n\n[USER QUERY]: ${message}` });

        const chatModel = this.configService.get<string>('app.ollamaModel') || 'qwen2.5:3b';
        
        // Timeout after 12 seconds if Ollama is taking too long
        const completionPromise = this.openai.chat.completions.create({
          model: chatModel,
          temperature: 0.4,
          max_tokens: 500,
          messages: messages,
        });

        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000));
        const completion = await Promise.race([completionPromise, timeoutPromise]);

        if (!completion || !(completion as any).choices?.[0]?.message?.content) {
          return { reply: buildFallbackReply(matchedProducts, isPolicyQuery ? STORE_KNOWLEDGE_BASE : undefined) };
        }

        const reply = (completion as any).choices[0].message.content;
        return { reply };
      } catch (error) {
        this.logger.error('Error in Ollama RAG completion:', error);
        return { reply: buildFallbackReply(matchedProducts, isPolicyQuery ? STORE_KNOWLEDGE_BASE : undefined) };
      }
    } catch (fatalErr) {
      this.logger.error('Fatal error in chatRag:', fatalErr);
      return {
        reply: 'Xin chào! Tôi là trợ lý AI ZestFoot. Hiện tại hệ thống đang cập nhật dữ liệu, bạn có thể tham khảo trực tiếp các mẫu giày trên website hoặc gửi lại yêu cầu để shop tư vấn nhé!',
      };
    }
  }

  private async retrieveContextWithVector(message: string): Promise<any[] | null> {
    return null;
  }

  
  async parseVoice(text: string) {
    if (!this.openai) {
      return {
        intent: 'unknown',
        brand: null,
        gender: null,
        category: null,
        corrected_text: text,
        target_page: null,
      };
    }
    const chatModel = this.configService.get<string>('app.ollamaModel') || 'qwen2.5:3b';
    return parseVoiceText(this.openai, chatModel, text);
  }

  
  async generateEmbeddings() {
    return {
      message: 'Vector embedding hiện tại không khả dụng trên môi trường Ollama Local offline.',
    };
  }
}
