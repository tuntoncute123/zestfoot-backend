import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateOrderCommand } from '../impl/create-order.command';
import { PrismaService } from '../../../database/prisma.service';

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateOrderCommand) {
    const order = await this.prisma.order.create({
      data: {
        customer: command.customer,
        items: command.items,
        sub_total: command.sub_total ?? null,
        shipping_fee: command.shipping_fee ?? null,
        discount: command.discount ?? null,
        total_amount: command.total_amount ?? null,
        status: command.status ?? 'pending',
        payment_method: command.payment_method,
        payment_info: command.payment_info ?? null,
        voucher_discount: command.voucher_discount ?? 0,
        voucher_code: command.voucher_code ?? null,
        point_discount: command.point_discount ?? 0,
        tracking_code: command.tracking_code ?? null,
        carrier: command.carrier ?? null,
        shipping_timeline: command.shipping_timeline ?? null,
        user_id: command.user_id ?? null,
      },
    });

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
