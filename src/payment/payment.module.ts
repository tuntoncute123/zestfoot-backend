import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { PayosService } from './payos.service';
import { PaymentController } from './payment.controller';

@Module({
  imports: [ConfigModule, DatabaseModule, WebSocketModule],
  controllers: [PaymentController],
  providers: [PayosService],
  exports: [PayosService],
})
export class PaymentModule {}
