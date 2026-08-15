import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UseCouponDto {
  @ApiProperty({ description: 'Mã giảm giá cần sử dụng', example: 'GIAM30K' })
  @IsString()
  @IsNotEmpty({ message: 'Mã giảm giá không được để trống' })
  code: string;
}
