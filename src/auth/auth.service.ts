import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { randomUUID } from 'crypto';
import { hashPassword, verifyPassword, generateToken, validateToken } from '../common/utils/security';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  validateToken(token: string): any {
    return validateToken(token);
  }

  async register(dto: RegisterDto) {
    try {
      const existing = await this.prisma.profile.findUnique({
        where: { email: dto.email.toLowerCase().trim() },
      });

      if (existing && existing.password) {
        throw new BadRequestException('Email đã tồn tại trong hệ thống');
      }

      const hashedPassword = hashPassword(dto.password);
      let profile;

      if (existing) {
        // Activate existing account by setting password
        profile = await this.prisma.profile.update({
          where: { id: existing.id },
          data: {
            password: hashedPassword,
            full_name: dto.fullName || existing.full_name,
            updated_at: new Date(),
          },
        });
      } else {
        // Create new account
        const uuid = randomUUID();
        profile = await this.prisma.profile.create({
          data: {
            id: uuid,
            email: dto.email.toLowerCase().trim(),
            password: hashedPassword,
            full_name: dto.fullName,
            points: 0,
            spin_tickets: 0,
            updated_at: new Date(),
          },
        });
      }

      const token = generateToken({ sub: profile.id, email: profile.email });

      return {
        user: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          points: profile.points ?? 0,
          spin_tickets: profile.spin_tickets ?? 0,
        },
        session: {
          access_token: token,
          token_type: 'bearer',
          expires_in: 7 * 24 * 60 * 60,
        },
      };
    } catch (error) {
      this.logger.error(`Lỗi khi đăng ký tài khoản cho email ${dto.email}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async login(dto: LoginDto) {
    try {
      const profile = await this.prisma.profile.findUnique({
        where: { email: dto.email.toLowerCase().trim() },
      });

      if (!profile || !profile.password || !verifyPassword(dto.password, profile.password)) {
        throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
      }

      const token = generateToken({ sub: profile.id, email: profile.email });

      return {
        user: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          points: profile.points ?? 0,
          spin_tickets: profile.spin_tickets ?? 0,
          role: profile.email?.toLowerCase().includes('admin') ? 'admin' : 'user',
          app_metadata: { role: profile.email?.toLowerCase().includes('admin') ? 'admin' : 'user' },
        },
        session: {
          access_token: token,
          token_type: 'bearer',
          expires_in: 7 * 24 * 60 * 60,
        },
      };
    } catch (error) {
      this.logger.error(`Lỗi khi đăng nhập tài khoản cho email ${dto.email}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getProfile(userId: string) {
    try {
      const profile = await this.prisma.profile.findUnique({
        where: { id: userId },
      });

      if (!profile) {
        throw new BadRequestException('Không tìm thấy thông tin người dùng');
      }

      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        points: profile.points,
        spin_tickets: profile.spin_tickets,
        last_lucky_spin: profile.last_lucky_spin,
      };
    } catch (error) {
      this.logger.error(`Lỗi khi lấy thông tin profile cho userId ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
