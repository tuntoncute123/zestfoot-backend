import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetOrdersByUserQuery } from './queries/impl/get-orders-by-user.query';
import { GetOrderByIdQuery } from './queries/impl/get-order-by-id.query';
import { CreateOrderCommand } from './commands/impl/create-order.command';
import { CancelOrderCommand } from './commands/impl/cancel-order.command';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
  ) {}

  async getOrdersByUser(email: string) {
    try {
      return await this.queryBus.execute(new GetOrdersByUserQuery(email));
    } catch (error) {
      this.logger.error(`Lỗi khi lấy danh sách đơn hàng cho email ${email}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getOrderById(id: string) {
    try {
      const order = await this.queryBus.execute(new GetOrderByIdQuery(id));
      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }
      return order;
    } catch (error) {
      this.logger.error(`Lỗi khi lấy thông tin chi tiết đơn hàng (ID ${id}): ${error.message}`, error.stack);
      throw error;
    }
  }

  async createOrder(dto: CreateOrderDto) {
    try {
      return await this.commandBus.execute(new CreateOrderCommand(dto));
    } catch (error) {
      this.logger.error(`Lỗi khi tạo đơn hàng mới: ${error.message}`, error.stack);
      throw error;
    }
  }

  async cancelOrder(id: string, reason?: string) {
    try {
      return await this.commandBus.execute(new CancelOrderCommand(id, reason));
    } catch (error) {
      this.logger.error(`Lỗi khi hủy đơn hàng (ID ${id}): ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAllOrders() {
    try {
      const orders = await this.prisma.order.findMany({
        orderBy: { created_at: 'desc' },
      });
      return orders.map(order => ({
        ...order,
        id: order.id.toString(),
        createdAt: order.created_at,
        paymentMethod: order.payment_method,
        paymentInfo: order.payment_info,
        totalAmount: order.total_amount,
        shippingFee: order.shipping_fee,
        subTotal: order.sub_total,
        discount: order.discount,
        customerJson: order.customer,
        orderItems: order.items,
      }));
    } catch (error) {
      this.logger.error(`Lỗi khi lấy danh sách tất cả đơn hàng: ${error.message}`, error.stack);
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
        totalAmount: order.total_amount,
        shippingFee: order.shipping_fee,
        subTotal: order.sub_total,
        discount: order.discount,
        customerJson: order.customer,
        orderItems: order.items,
      };
    } catch (error) {
      this.logger.error(`Lỗi khi cập nhật trạng thái đơn hàng (ID ${id}): ${error.message}`, error.stack);
      throw error;
    }
  }
}
