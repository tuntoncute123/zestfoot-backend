import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CancelOrderCommand } from '../impl/cancel-order.command';
import { PrismaService } from '../../../database/prisma.service';
import { AppGateway } from '../../../websocket/app.gateway';
import { NotFoundException } from '@nestjs/common';

@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appGateway: AppGateway,
  ) {}

  async execute(command: CancelOrderCommand) {
    const orderId = BigInt(command.id);

    const currentOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!currentOrder) {
      throw new NotFoundException(`Order with ID ${command.id} not found.`);
    }

    const currentPaymentInfo = currentOrder.payment_info ? (currentOrder.payment_info as any) : {};
    const updatedPaymentInfo = {
      ...currentPaymentInfo,
      cancellation_reason: command.reason,
      cancelled_at: new Date().toISOString(),
    };

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
        payment_info: updatedPaymentInfo,
      },
    });

    
    this.appGateway.broadcastOrderStatus(order.id.toString(), 'cancelled');

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
