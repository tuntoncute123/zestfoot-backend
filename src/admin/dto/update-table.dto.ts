import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateTableDto {
  @ApiProperty({ description: 'Tên bảng cần cập nhật', example: 'products' })
  @IsString()
  table: string;

  @ApiProperty({ description: 'ID dòng cần cập nhật (số hoặc UUID)', example: 1 })
  @IsNotEmpty()
  id: string | number;

  @ApiProperty({ description: 'Dữ liệu mới cần cập nhật', example: { name: 'Updated name' } })
  @IsNotEmpty()
  data: any;
}
