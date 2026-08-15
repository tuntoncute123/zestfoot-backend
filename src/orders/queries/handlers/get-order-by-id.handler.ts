import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetOrderByIdQuery } from '../impl/get-order-by-id.query';
import { PrismaService } from '../../../database/prisma.service';

@QueryHandler(GetOrderByIdQuery)
export class GetOrderByIdHandler implements IQueryHandler<GetOrderByIdQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetOrderByIdQuery) {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(query.id) },
    });

    if (!order) return null;

    return {
      ...order,
      id: order.id.toString(),
      sub_total: order.sub_total ? Number(order.sub_total) : null,
      shipping_fee: order.shipping_fee ? Number(order.shipping_fee) : null,
      discount: order.discount ? Number(order.discount) : null,
      total_amount: order.total_amount ? Number(order.total_amount) : null,
      voucher_discount: order.voucher_discount ? Number(order.voucher_discount) : 0,
      point_discount: order.point_discount ? Number(order.point_discount) : 0,
    };
  }
}
