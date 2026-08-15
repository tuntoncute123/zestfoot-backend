import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetOrdersByUserQuery } from '../impl/get-orders-by-user.query';
import { PrismaService } from '../../../database/prisma.service';

@QueryHandler(GetOrdersByUserQuery)
export class GetOrdersByUserHandler implements IQueryHandler<GetOrdersByUserQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetOrdersByUserQuery) {
    const { email } = query;
    // Find all orders where customer -> email = email
    const orders = await this.prisma.order.findMany({
      where: {
        customer: {
          path: ['email'],
          equals: email,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return orders.map(order => ({
      ...order,
      id: order.id.toString(),
      sub_total: order.sub_total ? Number(order.sub_total) : null,
      shipping_fee: order.shipping_fee ? Number(order.shipping_fee) : null,
      discount: order.discount ? Number(order.discount) : null,
      total_amount: order.total_amount ? Number(order.total_amount) : null,
      voucher_discount: order.voucher_discount ? Number(order.voucher_discount) : 0,
      point_discount: order.point_discount ? Number(order.point_discount) : 0,
    }));
  }
}
