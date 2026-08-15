import { Controller, Get, Post, Delete, Query, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { UseCouponDto } from './dto/use-coupon.dto';

@ApiTags('coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy toàn bộ danh sách mã giảm giá (Quyền Admin)' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả coupons.' })
  async getAll() {
    return this.productsService.getAllCoupons();
  }

  @Post()
  @ApiOperation({ summary: 'Tạo mã giảm giá mới (Quyền Admin)' })
  @ApiResponse({ status: 201, description: 'Tạo coupon thành công.' })
  async create(@Body() body: any) {
    return this.productsService.createCoupon(body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mã giảm giá theo ID (Quyền Admin)' })
  @ApiParam({ name: 'id', type: String, description: 'ID của coupon' })
  @ApiResponse({ status: 200, description: 'Xóa coupon thành công.' })
  async delete(@Param('id') id: string) {
    return this.productsService.deleteCoupon(id);
  }

  @Get('validate')
  @ApiOperation({ summary: 'Kiểm tra tính hợp lệ của mã giảm giá (Coupon/Voucher)' })
  @ApiQuery({ name: 'code', required: true, type: String, description: 'Mã giảm giá' })
  @ApiQuery({ name: 'orderTotal', required: true, type: String, description: 'Tổng giá trị đơn hàng' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'ID người dùng (để kiểm tra Voucher cá nhân)' })
  @ApiResponse({ status: 200, description: 'Kết quả kiểm tra hợp lệ và giá trị giảm.' })
  async validate(
    @Query('code') code: string,
    @Query('orderTotal') orderTotalStr: string,
    @Query('userId') userId?: string,
  ) {
    const orderTotal = Number(orderTotalStr || 0);
    return this.productsService.validateCoupon(code, orderTotal, userId);
  }

  @Post('use')
  @ApiOperation({ summary: 'Đánh dấu mã giảm giá đã được sử dụng (tăng số lượt dùng)' })
  @ApiResponse({ status: 200, description: 'Cập nhật số lượt dùng thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy coupon.' })
  async useCoupon(@Body() dto: UseCouponDto) {
    return this.productsService.useCoupon(dto.code);
  }
}
