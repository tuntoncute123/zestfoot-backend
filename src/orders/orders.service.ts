import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetOrdersByUserQuery } from './queries/impl/get-orders-by-user.query';
import { GetOrderByIdQuery } from './queries/impl/get-order-by-id.query';
import { CreateOrderCommand } from './commands/impl/create-order.command';
import { CancelOrderCommand } from './commands/impl/cancel-order.command';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from '../database/prisma.service';
import { GhnService } from '../ghn/ghn.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
    private readonly ghnService: GhnService,
  ) {}

  async getOrdersByUser(email: string) {
    try {
      return await this.queryBus.execute(new GetOrdersByUserQuery(email));
    } catch (error) {
      this.logger.error(`Lỗi lấy đơn hàng cho email ${email}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getOrderById(id: string) {
    try {
      const order = await this.queryBus.execute(new GetOrderByIdQuery(id));
      if (!order) {
        throw new NotFoundException(`Không tìm thấy đơn hàng #${id}`);
      }
      return order;
    } catch (error) {
      this.logger.error(`Lỗi lấy chi tiết đơn hàng #${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async createOrder(dto: CreateOrderDto) {
    try {
      return await this.commandBus.execute(new CreateOrderCommand(dto));
    } catch (error) {
      this.logger.error(`Lỗi tạo đơn hàng mới: ${error.message}`, error.stack);
      throw error;
    }
  }

  async cancelOrder(id: string, reason?: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: BigInt(id) },
      });

      if (order?.tracking_code) {
        await this.ghnService.cancelShippingOrder(order.tracking_code).catch((e) => {
          this.logger.warn(`Lỗi hủy đơn vận chuyển GHN: ${e.message}`);
        });
      }

      return await this.commandBus.execute(new CancelOrderCommand(id, reason));
    } catch (error) {
      this.logger.error(`Lỗi hủy đơn hàng #${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAllOrders() {
    try {
      const orders = await this.prisma.order.findMany({
        orderBy: { created_at: 'desc' },
      });
      return orders.map((order) => ({
        ...order,
        id: order.id.toString(),
        createdAt: order.created_at,
        paymentMethod: order.payment_method,
        paymentInfo: order.payment_info,
        totalAmount: order.total_amount ? Number(order.total_amount) : 0,
        shippingFee: order.shipping_fee ? Number(order.shipping_fee) : 0,
        subTotal: order.sub_total ? Number(order.sub_total) : 0,
        discount: order.discount ? Number(order.discount) : 0,
        voucherDiscount: order.voucher_discount ? Number(order.voucher_discount) : 0,
        pointDiscount: order.point_discount ? Number(order.point_discount) : 0,
        customerJson: order.customer,
        orderItems: order.items,
        trackingCode: order.tracking_code,
        carrier: order.carrier,
        shippingTimeline: order.shipping_timeline,
      }));
    } catch (error) {
      this.logger.error(`Lỗi lấy toàn bộ danh sách đơn hàng: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateOrderStatus(id: string, status: string) {
    try {
      const order = await this.prisma.order.update({
        where: { id: BigInt(id) },
        data: { status },
      });
      return {
        ...order,
        id: order.id.toString(),
        createdAt: order.created_at,
        paymentMethod: order.payment_method,
        paymentInfo: order.payment_info,
        totalAmount: order.total_amount ? Number(order.total_amount) : 0,
        shippingFee: order.shipping_fee ? Number(order.shipping_fee) : 0,
        subTotal: order.sub_total ? Number(order.sub_total) : 0,
        discount: order.discount ? Number(order.discount) : 0,
        voucherDiscount: order.voucher_discount ? Number(order.voucher_discount) : 0,
        pointDiscount: order.point_discount ? Number(order.point_discount) : 0,
        customerJson: order.customer,
        orderItems: order.items,
        trackingCode: order.tracking_code,
        carrier: order.carrier,
        shippingTimeline: order.shipping_timeline,
      };
    } catch (error) {
      this.logger.error(`Lỗi cập nhật trạng thái đơn hàng #${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async pushToGhn(id: string, options?: { note?: string; required_note?: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(id) },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${id}`);
    }

    const customer: any = order.customer || {};
    const items: any = Array.isArray(order.items) ? order.items : [];

    const result = await this.ghnService.createShippingOrder({
      order_id: id,
      to_name: customer.name || customer.fullName || 'Khách hàng ZestFoot',
      to_phone: customer.phone || '0987654321',
      to_address: customer.address || customer.detailAddress || 'Địa chỉ nhận hàng',
      to_district_id: customer.district_id || 1444,
      to_ward_code: customer.ward_code || '20308',
      cod_amount: order.payment_method === 'cod' ? Number(order.total_amount || 0) : 0,
      note: options?.note || 'Giày đá bóng chính hãng ZestFoot',
      required_note: options?.required_note || customer.required_note || 'CHOXEMHANGKHONGTHU',
      items: items.map((i: any) => ({
        name: i.name || i.product_name || 'Sản phẩm giày',
        code: i.code || `SKU-${i.product_id || '01'}`,
        quantity: Number(i.quantity || 1),
        price: Number(i.price || 0),
      })),
    });

    return result;
  }

  async getOrderTracking(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(id) },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${id}`);
    }

    let liveGhnDetail: any = null;
    if (order.tracking_code) {
      try {
        liveGhnDetail = await this.ghnService.getOrderDetail(order.tracking_code);
      } catch (e) {
        this.logger.warn(`Không thể lấy chi tiết GHN trực tiếp cho mã ${order.tracking_code}`);
      }
    }

    return {
      order_id: id,
      tracking_code: order.tracking_code,
      carrier: order.carrier || 'GHN Express',
      order_status: order.status,
      created_at: order.created_at,
      shipping_fee: order.shipping_fee ? Number(order.shipping_fee) : 0,
      shipping_timeline: order.shipping_timeline,
      live_ghn: liveGhnDetail,
    };
  }

  async syncGhnTracking(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(id) },
    });

    if (!order || !order.tracking_code) {
      throw new BadRequestException('Đơn hàng chưa có mã vận đơn GHN để đồng bộ');
    }

    const ghnDetail = await this.ghnService.getOrderDetail(order.tracking_code);
    return {
      success: true,
      order_id: id,
      tracking_code: order.tracking_code,
      ghn_status: ghnDetail.status,
      ghn_status_name: ghnDetail.status_name,
      logs: ghnDetail.logs,
    };
  }

  async reorder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(id) },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${id}`);
    }

    const items = Array.isArray(order.items) ? order.items : [];
    return {
      message: 'Lấy thông tin sản phẩm để mua lại thành công',
      items: items.map((item: any) => ({
        product_id: item.product_id || item.productId || item.id,
        name: item.name || item.product_name,
        price: item.price,
        size: item.size,
        quantity: item.quantity || 1,
        image: item.image,
      })),
    };
  }

  async requestReturn(id: string, reason: string, images?: string[]) {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(id) },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${id}`);
    }

    const returnData = {
      requested_at: new Date().toISOString(),
      reason,
      images: images || [],
      status: 'pending_approval',
    };

    const updated = await this.prisma.order.update({
      where: { id: BigInt(id) },
      data: {
        status: 'return_requested',
        payment_info: {
          ...((order.payment_info as any) || {}),
          return_request: returnData,
        },
      },
    });

    return {
      success: true,
      message: 'Yêu cầu trả hàng đã được ghi nhận. Bộ phận CSKH sẽ liên hệ trong 24h.',
      order_id: id,
      return_request: returnData,
    };
  }

  async confirmReceipt(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(id) },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${id}`);
    }

    const updated = await this.prisma.order.update({
      where: { id: BigInt(id) },
      data: {
        status: 'completed',
        payment_info: {
          ...((order.payment_info as any) || {}),
          received_at: new Date().toISOString(),
          customer_confirmed: true,
        },
      },
    });

    return {
      success: true,
      message: 'Đã xác nhận nhận hàng thành công.',
      order_id: id,
      status: 'completed',
    };
  }

  async getInvoice(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(id) },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${id}`);
    }

    const customer: any = order.customer || {};
    const items: any = Array.isArray(order.items) ? order.items : [];

    const subTotal = order.sub_total ? Number(order.sub_total) : 0;
    const shippingFee = order.shipping_fee ? Number(order.shipping_fee) : 0;
    const discount = (order.discount ? Number(order.discount) : 0) +
      (order.voucher_discount ? Number(order.voucher_discount) : 0) +
      (order.point_discount ? Number(order.point_discount) : 0);
    const totalAmount = order.total_amount ? Number(order.total_amount) : 0;

    return {
      invoice_number: `INV-ZEST-${order.id.toString().padStart(6, '0')}`,
      issue_date: order.created_at,
      seller: {
        company_name: 'CÔNG TY TNHH THỂ THAO ZESTFOOT VIỆT NAM',
        tax_code: '0317892345',
        address: 'Tầng 5, Tòa nhà ZestFoot Tower, Đường Linh Xuân, TP. Thủ Đức, TP. Hồ Chí Minh',
        hotline: '1900 8888',
        email: 'support@zestfoot.vn',
        website: 'https://zestfoot.vn',
      },
      buyer: {
        name: customer.name || customer.fullName || 'Khách hàng ZestFoot',
        phone: customer.phone || '—',
        email: customer.email || '—',
        address: customer.address || customer.detailAddress || '—',
      },
      items: items.map((item: any, index: number) => ({
        index: index + 1,
        name: item.name || item.product_name,
        size: item.size || 'Mặc định',
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.price || 0),
        total_price: Number((item.price || 0) * (item.quantity || 1)),
      })),
      summary: {
        sub_total: subTotal,
        shipping_fee: shippingFee,
        discount: discount,
        vat_rate: '8%',
        vat_amount: Math.round(totalAmount * 0.08 / 1.08),
        total_amount: totalAmount,
        payment_method: order.payment_method?.toUpperCase() || 'COD',
        payment_status: (order.payment_info as any)?.status || 'Đã ghi nhận',
      },
      shipping: {
        carrier: order.carrier || 'GHN Express',
        tracking_code: order.tracking_code || 'Chưa tạo vận đơn',
      },
    };
  }

  async getAdminStatistics() {
    const orders = await this.prisma.order.findMany();
    const totalOrders = orders.length;

    let totalRevenue = 0;
    const statusCounts: Record<string, number> = {
      pending: 0,
      processing: 0,
      shipping: 0,
      completed: 0,
      cancelled: 0,
      return_requested: 0,
    };

    for (const order of orders) {
      const status = order.status || 'pending';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      if (['completed', 'shipping', 'processing'].includes(status)) {
        totalRevenue += Number(order.total_amount || 0);
      }
    }

    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    return {
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      average_order_value: avgOrderValue,
      status_breakdown: statusCounts,
    };
  }
}
