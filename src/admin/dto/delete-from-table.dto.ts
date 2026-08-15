import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class DeleteFromTableDto {
  @ApiProperty({ description: 'Tên bảng cần xóa dòng', example: 'news' })
  @IsString()
  table: string;

  @ApiPropertyOptional({ description: 'ID dòng cần xóa (số hoặc UUID)', example: 1 })
  @IsOptional()
  id?: string | number;

  @ApiPropertyOptional({ description: 'Bộ điều kiện filter để xóa nhiều dòng (e.g. { post_id: 5 })', example: { post_id: 5 } })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}
