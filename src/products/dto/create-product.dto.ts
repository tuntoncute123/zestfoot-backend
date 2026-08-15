import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ description: 'Tên sản phẩm', example: 'Nike Air Max 90' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Thương hiệu', example: 'Nike' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ description: 'Giá gốc (VNĐ)', example: 3500000 })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ description: 'Giá nhập (VNĐ)', example: 2000000 })
  @IsNumber()
  @IsOptional()
  costPrice?: number;

  @ApiPropertyOptional({ description: 'Giá khuyến mãi (VNĐ)', example: 2800000 })
  @IsNumber()
  @IsOptional()
  salePrice?: number;

  @ApiPropertyOptional({ description: 'Đường dẫn ảnh sản phẩm', example: 'https://images.example.com/shoes.jpg' })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ description: 'Sản phẩm mới về', example: true })
  @IsBoolean()
  @IsOptional()
  isNew?: boolean;

  @ApiPropertyOptional({ description: 'Sản phẩm giảm giá', example: false })
  @IsBoolean()
  @IsOptional()
  isSale?: boolean;

  @ApiPropertyOptional({ description: 'Sản phẩm xu hướng', example: true })
  @IsBoolean()
  @IsOptional()
  isTrending?: boolean;

  @ApiPropertyOptional({ description: 'Hàng độc quyền ASICS', example: false })
  @IsBoolean()
  @IsOptional()
  isAsicsExclusive?: boolean;

  @ApiPropertyOptional({ description: 'Danh mục', example: 'shoes' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Danh mục con', example: 'sneaker' })
  @IsString()
  @IsOptional()
  subCategory?: string;

  @ApiPropertyOptional({ description: 'Giới tính phù hợp', example: 'men' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ description: 'Huy hiệu đi kèm', example: ['HOT', 'NEW'] })
  @IsOptional()
  badges?: any;
}
