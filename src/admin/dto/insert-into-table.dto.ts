import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray } from 'class-validator';

export class InsertIntoTableDto {
  @ApiProperty({ description: 'Tên bảng cần nạp', example: 'brands' })
  @IsString()
  table: string;

  @ApiProperty({
    description: 'Mảng dữ liệu cần chèn',
    example: [{ name: 'New Brand', slug: 'new-brand', logo: 'https://...' }],
  })
  @IsArray()
  data: any[];
}
