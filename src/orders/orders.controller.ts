import { Controller, Get, Post, Put, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('admin/statistics')
  @ApiOperation({ summary: 'Thống kê tổng quan đơn hàng (Admin)' })
  @ApiResponse({ status: 200, description: 'Dữ liệu thống kê doanh thu và đơn hàng.' })
  async getStatistics() {
    return this.ordersService.getAdminStatistics();
  }

  @Get()
  @ApiOperation({ summary: 'Lấy toàn bộ danh sách đơn hàng (Quyền Admin)' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả đơn hàng.' })
  async getAll() {
    return this.ordersService.getAllOrders();
  }

  @Get('user/:email')
  @ApiOperation({ summary: 'Lấy danh sách đơn hàng theo email khách hàng' })
  @ApiParam({ name: 'email', type: String, description: 'Email của khách hàng' })
  @ApiResponse({ status: 200, description: 'Danh sách đơn hàng của khách hàng.' })
  async getByUser(@Param('email') email: string) {
    return this.ordersService.getOrdersByUser(email);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một đơn hàng theo ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID của đơn hàng (BigInt)' })
  @ApiResponse({ status: 200, description: 'Chi tiết đơn hàng.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng.' })
  async getById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo đơn hàng mới' })
  @ApiResponse({ status: 201, description: 'Đơn hàng được tạo thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu đơn hàng không hợp lệ.' })
  async create(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn hàng (Quyền Admin)' })
  @ApiParam({ name: 'id', type: String, description: 'ID đơn hàng cần cập nhật' })
  @ApiResponse({ status: 200, description: 'Trạng thái đơn hàng được cập nhật thành công.' })
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.ordersService.updateOrderStatus(id, body.status);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Hủy đơn hàng' })
  @ApiParam({ name: 'id', type: String, description: 'ID đơn hàng cần hủy' })
  @ApiResponse({ status: 200, description: 'Đơn hàng đã được hủy thành công.' })
  @ApiResponse({ status: 400, description: 'Yêu cầu hủy không hợp lệ.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng.' })
  async cancel(@Param('id') id: string, @Body() dto: CancelOrderDto) {
    return this.ordersService.cancelOrder(id, dto.reason);
  }

  @Post(':id/ghn-create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo vận đơn giao hàng GHN cho đơn hàng' })
  @ApiParam({ name: 'id', type: String, description: 'ID đơn hàng' })
  async pushToGhn(@Param('id') id: string, @Body() body: { note?: string; required_note?: string }) {
    return this.ordersService.pushToGhn(id, body);
  }

  @Get(':id/tracking')
  @ApiOperation({ summary: 'Lấy thông tin và hành trình giao vận GHN của đơn hàng' })
  @ApiParam({ name: 'id', type: String, description: 'ID đơn hàng' })
  async getTracking(@Param('id') id: string) {
    return this.ordersService.getOrderTracking(id);
  }

  @Post(':id/sync-ghn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đồng bộ hành trình thời gian thực từ GHN' })
  @ApiParam({ name: 'id', type: String, description: 'ID đơn hàng' })
  async syncGhn(@Param('id') id: string) {
    return this.ordersService.syncGhnTracking(id);
  }

  @Post(':id/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy thông tin sản phẩm để mua lại (Re-order)' })
  @ApiParam({ name: 'id', type: String, description: 'ID đơn hàng' })
  async reorder(@Param('id') id: string) {
    return this.ordersService.reorder(id);
  }

  @Post(':id/return-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi yêu cầu đổi trả hàng / hoàn tiền' })
  @ApiParam({ name: 'id', type: String, description: 'ID đơn hàng' })
  async returnRequest(
    @Param('id') id: string,
    @Body() body: { reason: string; images?: string[] },
  ) {
    return this.ordersService.requestReturn(id, body.reason, body.images);
  }

  @Put(':id/confirm-receipt')
  @ApiOperation({ summary: 'Khách hàng xác nhận đã nhận hàng thành công' })
  @ApiParam({ name: 'id', type: String, description: 'ID đơn hàng' })
  async confirmReceipt(@Param('id') id: string) {
    return this.ordersService.confirmReceipt(id);
  }

  @Get(':id/invoice')
  @ApiOperation({ summary: 'Xuất dữ liệu hóa đơn điện tử' })
  @ApiParam({ name: 'id', type: String, description: 'ID đơn hàng' })
  async getInvoice(@Param('id') id: string) {
    return this.ordersService.getInvoice(id);
  }
}
