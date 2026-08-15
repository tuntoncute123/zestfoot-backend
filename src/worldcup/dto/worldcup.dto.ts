import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyTokenDto {
  @ApiProperty({ description: 'Mã vé dự thưởng (QR ticket code/token)', example: 'WC-TICKET-12345' })
  @IsString()
  @IsNotEmpty({ message: 'Token không được để trống' })
  token: string;
}

export class SpinDto {
  @ApiProperty({ description: 'Mã vé dự thưởng', example: 'WC-TICKET-12345' })
  @IsString()
  @IsNotEmpty({ message: 'Token không được để trống' })
  token: string;

  @ApiProperty({ description: 'ID tài khoản người dùng thực hiện lượt sút/quay', example: 'd3b07384-d113-4ec5-a5ae-be81d614d7cf' })
  @IsString()
  @IsNotEmpty({ message: 'UserId không được để trống' })
  userId: string;
}

export class ClaimShoeDto {
  @ApiProperty({ description: 'ID tài khoản người dùng đổi quà', example: 'd3b07384-d113-4ec5-a5ae-be81d614d7cf' })
  @IsString()
  @IsNotEmpty({ message: 'UserId không được để trống' })
  userId: string;

  @ApiProperty({ description: 'Size giày đổi thưởng', example: 42 })
  @IsNumber()
  @IsNotEmpty({ message: 'Size giày không được để trống' })
  size: number;

  @ApiProperty({ description: 'Họ và tên người nhận', example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  fullName: string;

  @ApiProperty({ description: 'Số điện thoại người nhận', example: '0987654321' })
  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: string;

  @ApiProperty({ description: 'Địa chỉ nhận hàng chi tiết', example: 'Số 123 Đường ABC, Quận 1, TP. HCM' })
  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ nhận hàng không được để trống' })
  address: string;
}
