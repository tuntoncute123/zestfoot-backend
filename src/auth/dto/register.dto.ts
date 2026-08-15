import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: 'Email của người dùng', example: 'user@example.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ description: 'Mật khẩu người dùng', example: 'password123' })
  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;

  @ApiProperty({ description: 'Tên đầy đủ của người dùng', example: 'Nguyễn Văn A' })
  @IsString({ message: 'Tên đầy đủ phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên đầy đủ không được để trống' })
  fullName: string;
}
