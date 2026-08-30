import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WorldCupService } from './worldcup.service';
import { VerifyTokenDto } from './dto/worldcup.dto';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly worldCupService: WorldCupService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy thông tin vé World Cup theo mã đơn hàng' })
  @ApiQuery({ name: 'order_id', required: true, type: String })
  async getByOrderId(@Query('order_id') orderId: string) {
    return this.worldCupService.getTicketByOrderId(orderId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo mã vé World Cup cho đơn hàng có giày' })
  async createTicket(
    @Body() body: { order_id: string; user_id?: string; expired_at?: string },
  ) {
    return this.worldCupService.createTicket(body.order_id, body.user_id, body.expired_at);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kiểm tra tính hợp lệ của mã vé dự thưởng World Cup' })
  @ApiResponse({ status: 200, description: 'Trạng thái hợp lệ kèm chi tiết mã vé hoặc thông tin lỗi.' })
  async verifyTicket(@Body() body: VerifyTokenDto) {
    return this.worldCupService.verifyToken(body.token);
  }
}
