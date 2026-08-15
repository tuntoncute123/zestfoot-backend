import { Controller, Get, Post, Put, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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
}
