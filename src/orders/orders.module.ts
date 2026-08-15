import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrdersController } from './orders.controller';
import { GetOrderByIdHandler } from './queries/handlers/get-order-by-id.handler';
import { GetOrdersByUserHandler } from './queries/handlers/get-orders-by-user.handler';
import { CreateOrderHandler } from './commands/handlers/create-order.handler';
import { CancelOrderHandler } from './commands/handlers/cancel-order.handler';

import { OrdersService } from './orders.service';

export const QueryHandlers = [
  GetOrderByIdHandler,
  GetOrdersByUserHandler,
];

export const CommandHandlers = [
  CreateOrderHandler,
  CancelOrderHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    ...QueryHandlers,
    ...CommandHandlers,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
