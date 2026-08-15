import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { mapVoucherFields } from '../common/utils/mapping';

@ApiTags('vouchers')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy toàn bộ danh sách voucher (Admin)' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả voucher.' })
  async getAllVouchers() {
    const vouchers = await this.prisma.userVoucher.findMany({
      orderBy: { created_at: 'desc' },
    });
    return vouchers.map(mapVoucherFields);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo voucher mới cho người dùng' })
  @ApiResponse({ status: 201, description: 'Voucher đã được tạo thành công.' })
  async createVoucher(@Body() body: any) {
    const userId = body.userId || body.user_id;
    const code = body.code;
    const discountAmount = body.discountAmount !== undefined ? Number(body.discountAmount) : Number(body.discount_amount || 0);
    const minOrderValue = body.minOrderValue !== undefined ? Number(body.minOrderValue) : (body.min_order_value !== undefined ? Number(body.min_order_value) : 0);
    const status = body.status || 'active';
    const expiresAt = body.expiresAt || body.expires_at ? new Date(body.expiresAt || body.expires_at) : null;

    const voucher = await this.prisma.userVoucher.create({
      data: {
        user_id: userId,
        code,
        discount_amount: discountAmount,
        min_order_value: minOrderValue,
        status,
        expires_at: expiresAt,
      },
    });
    return mapVoucherFields(voucher);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Lấy danh sách voucher của người dùng cụ thể' })
  @ApiParam({ name: 'userId', type: String, description: 'ID người dùng (UUID)' })
  @ApiResponse({ status: 200, description: 'Danh sách voucher của người dùng.' })
  async getVouchersByUser(@Param('userId') userId: string) {
    const vouchers = await this.prisma.userVoucher.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return vouchers.map(mapVoucherFields);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin voucher (sử dụng/hủy)' })
  @ApiParam({ name: 'id', type: String, description: 'ID voucher' })
  @ApiResponse({ status: 200, description: 'Voucher được cập nhật thành công.' })
  async updateVoucher(@Param('id') id: string, @Body() body: any) {
    const updateData: any = {};
    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.code !== undefined) {
      updateData.code = body.code;
    }
    if (body.discountAmount !== undefined || body.discount_amount !== undefined) {
      updateData.discount_amount = body.discountAmount !== undefined ? Number(body.discountAmount) : Number(body.discount_amount);
    }

    const voucher = await this.prisma.userVoucher.update({
      where: { id: BigInt(id) },
      data: updateData,
    });
    return mapVoucherFields(voucher);
  }
}
