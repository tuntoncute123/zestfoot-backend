import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { ProfilesModule } from './profiles/profiles.module';
import { WebSocketModule } from './websocket/websocket.module';
import { AdminModule } from './admin/admin.module';
import { WorldCupModule } from './worldcup/worldcup.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { SocialModule } from './social/social.module';
import { GhnModule } from './ghn/ghn.module';
import { PaymentModule } from './payment/payment.module';
import { RedisModule } from './common/redis.module';
import { appConfig } from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.backend', '.env'],
      load: [appConfig],
    }),
    RedisModule,
    DatabaseModule,
    ProductsModule,
    OrdersModule,
    PaymentModule,
    GhnModule,
    ProfilesModule,
    WebSocketModule,
    AdminModule,
    WorldCupModule,
    AuthModule,
    AiModule,
    SocialModule,
  ],
})
export class AppModule {}
