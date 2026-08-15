import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({ description: 'Lý do hủy đơn hàng', example: 'Thay đổi ý định mua hàng' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
