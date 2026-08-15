import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsNumber, IsString } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Thông tin khách hàng (JSON)',
    example: { email: 'john@example.com', name: 'John Doe', phone: '0987654321', address: '123 Street' },
  })
  @IsNotEmpty()
  customer: any;

  @ApiProperty({
    description: 'Danh sách sản phẩm trong giỏ (JSON)',
    example: [
      { product_id: '1', quantity: 2, size: 42, name: 'Nike Runner', price: 1500000 }
    ],
  })
  @IsNotEmpty()
  items: any;

  @ApiPropertyOptional({ description: 'Tạm tính (VNĐ)', example: 3000000 })
  @IsNumber()
  @IsOptional()
  sub_total?: number;

  @ApiPropertyOptional({ description: 'Phí giao hàng (VNĐ)', example: 30000 })
  @IsNumber()
  @IsOptional()
  shipping_fee?: number;

  @ApiPropertyOptional({ description: 'Giảm giá tổng (VNĐ)', example: 100000 })
  @IsNumber()
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({ description: 'Tổng tiền thanh toán (VNĐ)', example: 2930000 })
  @IsNumber()
  @IsOptional()
  total_amount?: number;

  @ApiPropertyOptional({ description: 'Trạng thái đơn hàng', example: 'pending', default: 'pending' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Phương thức thanh toán', example: 'momo' })
  @IsString()
  @IsOptional()
  payment_method?: string;

  @ApiPropertyOptional({
    description: 'Thông tin thanh toán chi tiết (JSON)',
    example: { transaction_id: 'MOMO12345678', paid_at: '2026-06-23T14:00:00Z', status: 'paid' },
  })
  @IsOptional()
  payment_info?: any;

  @ApiPropertyOptional({ description: 'Số tiền giảm từ voucher (VNĐ)', example: 50000 })
  @IsNumber()
  @IsOptional()
  voucher_discount?: number;

  @ApiPropertyOptional({ description: 'Mã voucher áp dụng', example: 'SUMMER50' })
  @IsString()
  @IsOptional()
  voucher_code?: string;

  @ApiPropertyOptional({ description: 'Số tiền giảm bằng điểm (VNĐ)', example: 50000 })
  @IsNumber()
  @IsOptional()
  point_discount?: number;
}
