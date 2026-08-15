import { Controller, Post, Get, Body, Req, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản người dùng mới' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công.' })
  @ApiResponse({ status: 400, description: 'Yêu cầu không hợp lệ hoặc email đã tồn tại.' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập tài khoản người dùng' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công.' })
  @ApiResponse({ status: 401, description: 'Thông tin đăng nhập không hợp lệ.' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin profile người dùng hiện tại' })
  @ApiResponse({ status: 200, description: 'Thành công.' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn.' })
  async getProfile(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token không hợp lệ hoặc không được cung cấp');
    }

    const token = authHeader.split(' ')[1];
    const decoded = this.authService.validateToken(token);

    if (!decoded || !decoded.sub) {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }

    return this.authService.getProfile(decoded.sub);
  }
}
