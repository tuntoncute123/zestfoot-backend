import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SpinLuckyWheelDto {
  @ApiProperty({ description: 'Tên hiển thị của người chơi quay thưởng', example: 'Nguyen Van A' })
  @IsString()
  @IsNotEmpty()
  userName: string;
}
