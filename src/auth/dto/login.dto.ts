import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Email của người dùng', example: 'user@example.com' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ description: 'Mật khẩu người dùng', example: 'password123' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;
}
