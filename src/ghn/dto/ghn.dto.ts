import { IsNotEmpty, IsNumber, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetDistrictsDto {
  @ApiProperty({ description: 'ID Tỉnh / Thành phố', example: 201 })
  @IsNotEmpty()
  @IsNumber()
  province_id: number;
}

export class GetWardsDto {
  @ApiProperty({ description: 'ID Quận / Huyện', example: 1442 })
  @IsNotEmpty()
  @IsNumber()
  district_id: number;
}

export class GetServicesDto {
  @ApiProperty({ description: 'ID Quận / Huyện đích', example: 1444 })
  @IsNotEmpty()
  @IsNumber()
  to_district: number;

  @ApiPropertyOptional({ description: 'ID Quận / Huyện xuất phát', example: 1442 })
  @IsOptional()
  @IsNumber()
  from_district?: number;

  @ApiPropertyOptional({ description: 'ID Cửa hàng GHN' })
  @IsOptional()
  @IsNumber()
  shop_id?: number;
}

export class CalculateShippingFeeDto {
  @ApiProperty({ description: 'ID Quận / Huyện người nhận', example: 1444 })
  @IsNotEmpty()
  @IsNumber()
  to_district_id: number;

  @ApiProperty({ description: 'Mã Phường / Xã người nhận', example: '20308' })
  @IsNotEmpty()
  @IsString()
  to_ward_code: string;

  @ApiPropertyOptional({ description: 'ID Quận / Huyện gửi hàng', example: 1442 })
  @IsOptional()
  @IsNumber()
  from_district_id?: number;

  @ApiPropertyOptional({ description: 'Mã Phường / Xã gửi hàng', example: '21211' })
  @IsOptional()
  @IsString()
  from_ward_code?: string;

  @ApiPropertyOptional({ description: 'ID Dịch vụ giao hàng GHN', example: 53320 })
  @IsOptional()
  @IsNumber()
  service_id?: number;

  @ApiPropertyOptional({ description: 'Loại dịch vụ (1: Bay, 2: Chuẩn, 3: Tiết kiệm)', example: 2 })
  @IsOptional()
  @IsNumber()
  service_type_id?: number;

  @ApiPropertyOptional({ description: 'Trọng lượng kiện hàng (gram)', example: 800 })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ description: 'Chiều dài (cm)', example: 30 })
  @IsOptional()
  @IsNumber()
  length?: number;

  @ApiPropertyOptional({ description: 'Chiều rộng (cm)', example: 20 })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ description: 'Chiều cao (cm)', example: 15 })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ description: 'Giá trị bảo hiểm đơn hàng (VND)', example: 1500000 })
  @IsOptional()
  @IsNumber()
  insurance_value?: number;

  @ApiPropertyOptional({ description: 'Mã khuyến mãi GHN' })
  @IsOptional()
  @IsString()
  coupon?: string;
}

export class CalculateLeadTimeDto {
  @ApiProperty({ description: 'ID Quận / Huyện người nhận', example: 1444 })
  @IsNotEmpty()
  @IsNumber()
  to_district_id: number;

  @ApiProperty({ description: 'Mã Phường / Xã người nhận', example: '20308' })
  @IsNotEmpty()
  @IsString()
  to_ward_code: string;

  @ApiPropertyOptional({ description: 'ID Quận / Huyện gửi hàng', example: 1442 })
  @IsOptional()
  @IsNumber()
  from_district_id?: number;

  @ApiPropertyOptional({ description: 'Mã Phường / Xã gửi hàng', example: '21211' })
  @IsOptional()
  @IsString()
  from_ward_code?: string;

  @ApiPropertyOptional({ description: 'ID Dịch vụ giao hàng GHN', example: 53320 })
  @IsOptional()
  @IsNumber()
  service_id?: number;
}

export class GhnItemDto {
  @ApiProperty({ description: 'Tên sản phẩm' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Mã SKU sản phẩm' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Số lượng' })
  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Đơn giá' })
  @IsNotEmpty()
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ description: 'Trọng lượng từng món (gram)' })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ description: 'Kích thước / Size' })
  @IsOptional()
  @IsString()
  category?: { level1?: string };
}

export class CreateGhnOrderDto {
  @ApiProperty({ description: 'ID Đơn hàng nội bộ trong hệ thống ZestFoot' })
  @IsNotEmpty()
  @IsString()
  order_id: string;

  @ApiProperty({ description: 'Tên người nhận' })
  @IsNotEmpty()
  @IsString()
  to_name: string;

  @ApiProperty({ description: 'Số điện thoại người nhận' })
  @IsNotEmpty()
  @IsString()
  to_phone: string;

  @ApiProperty({ description: 'Địa chỉ chi tiết người nhận (số nhà, đường)' })
  @IsNotEmpty()
  @IsString()
  to_address: string;

  @ApiProperty({ description: 'ID Quận/Huyện nhận' })
  @IsNotEmpty()
  @IsNumber()
  to_district_id: number;

  @ApiProperty({ description: 'Mã Phường/Xã nhận' })
  @IsNotEmpty()
  @IsString()
  to_ward_code: string;

  @ApiPropertyOptional({ description: 'Tiền thu hộ COD (VND)', example: 0 })
  @IsOptional()
  @IsNumber()
  cod_amount?: number;

  @ApiPropertyOptional({ description: 'Ghi chú cho shipper', example: 'Hàng dễ vỡ, xin nhẹ tay' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Quy định cho xem hàng: CHOTHUHANG | CHOXEMHANGKHONGTHU | KHONGCHOXEMHANG',
    example: 'CHOXEMHANGKHONGTHU',
  })
  @IsOptional()
  @IsString()
  required_note?: string;

  @ApiPropertyOptional({ description: 'ID Dịch vụ giao hàng', example: 53320 })
  @IsOptional()
  @IsNumber()
  service_id?: number;

  @ApiPropertyOptional({ description: 'Loại dịch vụ GHN', example: 2 })
  @IsOptional()
  @IsNumber()
  service_type_id?: number;

  @ApiPropertyOptional({ description: 'Trọng lượng gói hàng (gram)', example: 800 })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ description: 'Chiều dài (cm)', example: 30 })
  @IsOptional()
  @IsNumber()
  length?: number;

  @ApiPropertyOptional({ description: 'Chiều rộng (cm)', example: 20 })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ description: 'Chiều cao (cm)', example: 15 })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ description: 'Danh sách sản phẩm trong kiện', type: [GhnItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GhnItemDto)
  items?: GhnItemDto[];
}

export class CancelGhnOrderDto {
  @ApiProperty({ description: 'Mã vận đơn GHN cần hủy' })
  @IsNotEmpty()
  @IsString()
  order_code: string;
}
