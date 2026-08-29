import { IsNotEmpty, IsNumber, IsOptional, IsString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentItemDto {
  @ApiProperty({ description: 'Tên sản phẩm', example: 'Giày Sneaker Nike Air' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Số lượng', example: 1 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Đơn giá (VND)', example: 250000 })
  @IsNumber()
  price: number;
}

export class CreatePaymentLinkDto {
  @ApiProperty({ description: 'Mã đơn hàng trong hệ thống (ID/Code)', example: 1724508934 })
  @IsNotEmpty()
  orderId: string | number;

  @ApiProperty({ description: 'Tổng số tiền thanh toán (VND)', example: 250000 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Mô tả giao dịch (tối đa 25 ký tự)', example: 'Thanh toan ZestFoot' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Danh sách sản phẩm trong đơn', type: [PaymentItemDto] })
  @IsOptional()
  @IsArray()
  items?: PaymentItemDto[];

  @ApiPropertyOptional({ description: 'URL chuyển hướng khi thanh toán thành công' })
  @IsOptional()
  @IsString()
  returnUrl?: string;

  @ApiPropertyOptional({ description: 'URL chuyển hướng khi người dùng hủy' })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
