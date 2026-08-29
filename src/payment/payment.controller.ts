import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PayosService } from './payos.service';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly payosService: PayosService) {}

  @Post('payos/create-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tạo liên kết thanh toán PayOS (VietQR)' })
  @ApiResponse({ status: 200, description: 'Tạo link thanh toán thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  async createPaymentLink(@Body() dto: CreatePaymentLinkDto) {
    return this.payosService.createPaymentLink(dto);
  }

  @Post('payos-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook tiếp nhận thông báo thanh toán tự động từ PayOS' })
  async handleWebhook(@Body() body: any) {
    return this.payosService.handleWebhook(body);
  }

  @Get('payos/status/:orderCode')
  @ApiOperation({ summary: 'Tra cứu trạng thái thanh toán PayOS theo mã đơn hàng' })
  @ApiParam({ name: 'orderCode', type: String, description: 'Mã đơn hàng PayOS' })
  async getPaymentStatus(@Param('orderCode') orderCode: string) {
    return this.payosService.getPaymentLinkInfo(orderCode);
  }

  @Post('payos/cancel/:orderCode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hủy liên kết thanh toán PayOS' })
  @ApiParam({ name: 'orderCode', type: String, description: 'Mã đơn hàng PayOS' })
  async cancelPaymentLink(
    @Param('orderCode') orderCode: string,
    @Body('reason') reason?: string,
  ) {
    const code = parseInt(orderCode, 10);
    return this.payosService.cancelPaymentLink(code, reason);
  }
}
