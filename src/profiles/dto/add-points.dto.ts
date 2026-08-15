import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsIn } from 'class-validator';

export class AddPointsDto {
  @ApiProperty({ description: 'Số điểm cần cộng/trừ', example: 100 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Lý do cộng/trừ điểm', example: 'Hoàn thành game đập bong bóng' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ description: 'Loại thay đổi (earn: cộng điểm, spend: trừ/sử dụng điểm)', example: 'earn', enum: ['earn', 'spend'] })
  @IsString()
  @IsIn(['earn', 'spend'])
  type: 'earn' | 'spend';
}
