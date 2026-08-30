import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, urlencoded } from 'express';



(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3001;

  
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  
  app.setGlobalPrefix('zestfoot');

  
  const config = new DocumentBuilder()
    .setTitle('ZestFoot API')
    .setDescription('ZestFoot NextJS + NestJS Backend API Documentation')
    .setVersion('1.0')
    .addTag('auth', 'Đăng ký / Đăng nhập tài khoản')
    .addTag('products', 'API quản lý sản phẩm, thương hiệu, danh mục')
    .addTag('brands', 'API danh sách thương hiệu')
    .addTag('news', 'API tin tức blog')
    .addTag('orders', 'API quản lý đơn hàng, đặt hàng, hủy đơn')
    .addTag('profiles', 'API tài khoản người dùng, điểm thưởng, vòng quay may mắn')
    .addTag('users', 'API thông tin & cập nhật người dùng')
    .addTag('points', 'API tích lũy / lịch sử điểm thưởng')
    .addTag('vouchers', 'API voucher người dùng')
    .addTag('coupons', 'API kiểm tra & sử dụng mã giảm giá')
    .addTag('reviews', 'API đánh giá sản phẩm')
    .addTag('games', 'API bảng xếp hạng game')
    .addTag('worldcup', 'API mini-game World Cup')
    .addTag('admin', 'API quản trị nội bộ')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);
  console.log(`ZestFoot NestJS Backend is running on: http://localhost:${port}`);
  console.log(`API prefix: http://localhost:${port}/zestfoot`);
  console.log(`Swagger Documentation is available at: http://localhost:${port}/docs`);
}
bootstrap();
