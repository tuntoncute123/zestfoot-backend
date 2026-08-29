import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { AppGateway } from '../websocket/app.gateway';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { PayOS } from '@payos/node';

@Injectable()
export class PayosService {
  private readonly logger = new Logger(PayosService.name);
  private payos: PayOS;
  private clientId: string;
  private apiKey: string;
  private checksumKey: string;
  private frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly wsGateway: AppGateway,
  ) {
    this.clientId = this.configService.get<string>('PAYOS_CLIENT_ID') || '5b220813-e055-4da8-8b23-f1ac14ab46a5';
    this.apiKey = this.configService.get<string>('PAYOS_API_KEY') || 'e326e113-0cc0-4c5e-ac26-2409b7ae5835';
    this.checksumKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY') || '60e3903ab1868d493d615f3d17343c9c6322359b2c1f5bd9d1d77a648eeaac9f';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    try {
      this.payos = new PayOS({
        clientId: this.clientId,
        apiKey: this.apiKey,
        checksumKey: this.checksumKey,
      });
      this.logger.log('PayOS SDK v2 initialized successfully with client credentials.');
    } catch (err) {
      this.logger.error(`Failed to initialize PayOS SDK: ${err.message}`);
    }
  }

  
  public generateOrderCode(orderId: string | number): number {
    const parsed = parseInt(String(orderId).replace(/\D/g, ''), 10);
    const baseId = !isNaN(parsed) && parsed > 0 ? (parsed % 100000) : 100;
    const nowStr = Date.now().toString();
    const randomSuffix = Math.floor(10 + Math.random() * 90).toString();
    
    const codeStr = `${baseId}${nowStr.slice(-4)}${randomSuffix}`;
    return parseInt(codeStr, 10);
  }

  
  public sanitizeDescription(rawDesc?: string, orderCode?: number): string {
    if (!rawDesc) {
      return `ZestFoot ${orderCode || ''}`.slice(0, 25).trim();
    }
    
    const nonAccent = rawDesc
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const desc = nonAccent.length > 0 ? nonAccent : `ZestFoot ${orderCode || ''}`;
    return desc.slice(0, 25).trim();
  }

  
  async createPaymentLink(dto: CreatePaymentLinkDto) {
    try {
      if (!this.payos) {
        this.payos = new PayOS({
          clientId: this.clientId,
          apiKey: this.apiKey,
          checksumKey: this.checksumKey,
        });
      }

      const orderCode = this.generateOrderCode(dto.orderId);
      const amount = Math.round(Number(dto.amount));

      if (amount <= 0) {
        throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0 VND');
      }

      const description = this.sanitizeDescription(dto.description, orderCode);
      const returnUrl = dto.returnUrl || `${this.frontendUrl}/payment-gateway/payos?orderId=${dto.orderId}&status=PAID`;
      const cancelUrl = dto.cancelUrl || `${this.frontendUrl}/checkout?payment=cancelled&orderId=${dto.orderId}`;

      
      let items: Array<{ name: string; quantity: number; price: number }> = [];
      if (dto.items && dto.items.length > 0) {
        const rawSum = dto.items.reduce((sum, item) => sum + (Math.round(item.price) * Math.max(1, Math.round(item.quantity))), 0);
        if (rawSum === amount) {
          items = dto.items.map(item => ({
            name: this.sanitizeDescription(item.name).slice(0, 50),
            quantity: Math.max(1, Math.round(item.quantity)),
            price: Math.max(0, Math.round(item.price)),
          }));
        } else {
          
          items = [
            {
              name: `Don hang ZestFoot ${dto.orderId}`.slice(0, 50),
              quantity: 1,
              price: amount,
            },
          ];
        }
      } else {
        items = [
          {
            name: `Don hang ZestFoot ${dto.orderId}`.slice(0, 50),
            quantity: 1,
            price: amount,
          },
        ];
      }

      const paymentData = {
        orderCode,
        amount,
        description,
        items,
        cancelUrl,
        returnUrl,
      };

      this.logger.log(`Calling PayOS paymentRequests.create for order #${dto.orderId} (code: ${orderCode}, amount: ${amount} VND)`);

      const paymentLinkResponse = await this.payos.paymentRequests.create(paymentData);

      
      try {
        const orderIdBigInt = BigInt(String(dto.orderId).replace(/\D/g, '') || orderCode);
        const existingOrder = await this.prisma.order.findUnique({
          where: { id: orderIdBigInt },
        });

        if (existingOrder) {
          const currentPaymentInfo = (typeof existingOrder.payment_info === 'object' && existingOrder.payment_info !== null)
            ? (existingOrder.payment_info as Record<string, any>)
            : {};

          await this.prisma.order.update({
            where: { id: orderIdBigInt },
            data: {
              payment_method: 'payos',
              payment_info: {
                ...currentPaymentInfo,
                method: 'payos',
                status: 'pending',
                order_code: orderCode,
                payment_link_id: paymentLinkResponse.paymentLinkId,
                checkout_url: paymentLinkResponse.checkoutUrl,
                qr_code: paymentLinkResponse.qrCode,
                account_number: paymentLinkResponse.accountNumber,
                account_name: paymentLinkResponse.accountName,
              },
            },
          });
        }
      } catch (dbErr) {
        this.logger.warn(`Could not update order payment_info in DB: ${dbErr.message}`);
      }

      return {
        success: true,
        orderCode,
        orderId: dto.orderId,
        checkoutUrl: paymentLinkResponse.checkoutUrl,
        qrCode: paymentLinkResponse.qrCode,
        paymentLinkId: paymentLinkResponse.paymentLinkId,
        accountName: paymentLinkResponse.accountName,
        accountNumber: paymentLinkResponse.accountNumber,
        amount: paymentLinkResponse.amount,
        description: paymentLinkResponse.description,
      };
    } catch (error) {
      this.logger.error(`PayOS createPaymentLink error: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Lỗi tạo liên kết thanh toán PayOS');
    }
  }

  
  async getPaymentLinkInfo(orderIdOrCode: string | number) {
    try {
      const orderCode = this.generateOrderCode(orderIdOrCode);
      const info = await this.payos.paymentRequests.get(orderCode);

      
      if (info && info.status === 'PAID') {
        await this.handlePaymentSuccess(orderCode, info);
      }

      return {
        success: true,
        data: info,
      };
    } catch (error) {
      this.logger.error(`Error querying PayOS info: ${error.message}`);
      throw new NotFoundException(`Không tìm thấy thông tin thanh toán cho mã #${orderIdOrCode}`);
    }
  }

  
  async cancelPaymentLink(orderCode: number, reason: string = 'Khach hang huy thanh toan') {
    try {
      const sanitizedReason = this.sanitizeDescription(reason);
      const result = await this.payos.paymentRequests.cancel(orderCode, sanitizedReason);
      return { success: true, data: result };
    } catch (error) {
      this.logger.error(`Error cancelling PayOS link: ${error.message}`);
      throw new BadRequestException(`Không thể hủy liên kết thanh toán: ${error.message}`);
    }
  }

  
  async handleWebhook(webhookBody: any) {
    try {
      this.logger.log(`Received PayOS Webhook: ${JSON.stringify(webhookBody)}`);

      
      const verifiedData = await this.payos.webhooks.verify(webhookBody);

      if (!verifiedData) {
        this.logger.warn('PayOS webhook verification failed: Signature mismatch.');
        return { success: false, message: 'Invalid webhook signature' };
      }

      this.logger.log(`PayOS Webhook Verified successfully for orderCode: ${verifiedData.orderCode}`);

      
      if (webhookBody.code === '00' || webhookBody.success === true || verifiedData.code === '00') {
        await this.handlePaymentSuccess(verifiedData.orderCode, verifiedData);
      }

      return {
        success: true,
        message: 'Webhook processed successfully',
        data: verifiedData,
      };
    } catch (error) {
      this.logger.error(`PayOS webhook handling error: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  
  private async handlePaymentSuccess(orderCode: number, payosData: any) {
    try {
      const orderIdBigInt = BigInt(orderCode);
      let order = await this.prisma.order.findFirst({
        where: {
          OR: [
            { id: orderIdBigInt },
          ],
        },
      });

      if (!order) {
        const recentOrders = await this.prisma.order.findMany({
          orderBy: { id: 'desc' },
          take: 50,
        });
        order = recentOrders.find(o => {
          const pInfo = o.payment_info as Record<string, any>;
          return pInfo && (pInfo.order_code === orderCode || String(pInfo.order_code) === String(orderCode));
        }) || null;
      }

      if (!order) {
        this.logger.warn(`Order #${orderCode} not found in database to mark as paid.`);
        return;
      }

      const currentPaymentInfo = (typeof order.payment_info === 'object' && order.payment_info !== null)
        ? (order.payment_info as Record<string, any>)
        : {};

      
      const updatedOrder = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: order.status === 'pending' ? 'processing' : order.status,
          payment_method: 'payos',
          payment_info: {
            ...currentPaymentInfo,
            method: 'payos',
            status: 'paid',
            paid_at: new Date().toISOString(),
            transaction_id: payosData.reference || String(orderCode),
            payment_link_id: payosData.paymentLinkId || currentPaymentInfo.payment_link_id,
            amount_paid: payosData.amount || Number(order.total_amount),
            payos_response: payosData,
          },
        },
      });

      this.logger.log(`Order #${order.id} marked as PAID via PayOS!`);

      
      this.wsGateway.broadcastOrderStatus(order.id.toString(), 'processing');

      return updatedOrder;
    } catch (err) {
      this.logger.error(`Failed to update order status to PAID: ${err.message}`, err.stack);
    }
  }
}

