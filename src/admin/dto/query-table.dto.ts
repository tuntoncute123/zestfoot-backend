import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderByItem {
  @IsString()
  column: string;

  @IsBoolean()
  ascending: boolean;
}

export class RangeOption {
  @IsNumber()
  from: number;

  @IsNumber()
  to: number;
}

export class QueryTableDto {
  @ApiProperty({ description: 'Tên bảng cần truy vấn', example: 'products' })
  @IsString()
  table: string;

  @ApiPropertyOptional({ description: 'Điều kiện lọc bằng nhau (eq)', example: { id: 1 } })
  @IsOptional()
  @IsObject()
  eq?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Điều kiện lọc tương tự (ilike)', example: { name: '%shoes%' } })
  @IsOptional()
  @IsObject()
  ilike?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Sắp xếp kết quả',
    example: [{ column: 'created_at', ascending: false }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderByItem)
  orderBy?: OrderByItem[];

  @ApiPropertyOptional({ description: 'Khoảng dòng cần lấy (phục vụ phân trang)', example: { from: 0, to: 9 } })
  @IsOptional()
  @ValidateNested()
  @Type(() => RangeOption)
  range?: RangeOption;

  @ApiPropertyOptional({ description: 'Số lượng tối đa dòng cần lấy', example: 10 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: 'Lọc đếm dòng chuyên dụng (exact/planned/estimated)', example: 'exact' })
  @IsOptional()
  @IsString()
  countOption?: 'exact' | 'planned' | 'estimated' | null;

  @ApiPropertyOptional({ description: 'Chỉ lấy số lượng, không lấy dữ liệu', example: false })
  @IsOptional()
  @IsBoolean()
  head?: boolean;

  @ApiPropertyOptional({ description: 'Chỉ lấy một dòng duy nhất', example: false })
  @IsOptional()
  @IsBoolean()
  single?: boolean;
}
