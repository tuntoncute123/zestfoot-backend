import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { GhnService } from './ghn.service';
import {
  CalculateShippingFeeDto,
  CalculateLeadTimeDto,
  CreateGhnOrderDto,
  CancelGhnOrderDto,
  GetServicesDto,
} from './dto/ghn.dto';

@ApiTags('ghn')
@Controller('ghn')
export class GhnController {
  constructor(private readonly ghnService: GhnService) {}

  @Get('provinces')
  @ApiOperation({ summary: 'Lấy danh sách Tỉnh / Thành phố từ GHN' })
  @ApiResponse({ status: 200, description: 'Danh sách Tỉnh/Thành.' })
  async getProvinces() {
    return this.ghnService.getProvinces();
  }

  @Get('districts/:provinceId')
  @ApiOperation({ summary: 'Lấy danh sách Quận / Huyện theo Tỉnh' })
  @ApiParam({ name: 'provinceId', type: Number, description: 'ID Tỉnh / Thành' })
  async getDistricts(@Param('provinceId') provinceId: string) {
    return this.ghnService.getDistricts(Number(provinceId));
  }

  @Get('wards/:districtId')
  @ApiOperation({ summary: 'Lấy danh sách Phường / Xã theo Quận / Huyện' })
  @ApiParam({ name: 'districtId', type: Number, description: 'ID Quận / Huyện' })
  async getWards(@Param('districtId') districtId: string) {
    return this.ghnService.getWards(Number(districtId));
  }

  @Post('services')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách gói dịch vụ giao hàng GHN khả dụng' })
  async getAvailableServices(@Body() body: GetServicesDto) {
    return this.ghnService.getAvailableServices(body.to_district, body.from_district);
  }

  @Post('fee')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tính phí vận chuyển GHN chính xác' })
  async calculateFee(@Body() dto: CalculateShippingFeeDto) {
    return this.ghnService.calculateFee(dto);
  }

  @Post('leadtime')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tính thời gian dự kiến giao hàng GHN' })
  async calculateLeadTime(@Body() dto: CalculateLeadTimeDto) {
    return this.ghnService.calculateLeadTime(dto);
  }

  @Post('create-order')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo đơn vận chuyển trên GHN Express' })
  async createShippingOrder(@Body() dto: CreateGhnOrderDto) {
    return this.ghnService.createShippingOrder(dto);
  }

  @Get('tracking/:orderCode')
  @ApiOperation({ summary: 'Tra cứu trạng thái vận đơn GHN trực tiếp' })
  @ApiParam({ name: 'orderCode', type: String, description: 'Mã vận đơn GHN' })
  async getTracking(@Param('orderCode') orderCode: string) {
    return this.ghnService.getOrderDetail(orderCode);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hủy đơn vận chuyển GHN' })
  async cancelShippingOrder(@Body() dto: CancelGhnOrderDto) {
    return this.ghnService.cancelShippingOrder(dto.order_code);
  }

  @Get('print/:orderCode')
  @ApiOperation({ summary: 'Lấy link in phiếu giao hàng GHN (A5 hoặc 80x80)' })
  @ApiParam({ name: 'orderCode', type: String, description: 'Mã vận đơn GHN (hoặc nhiều mã cách nhau bằng dấu phẩy)' })
  async getPrintUrl(@Param('orderCode') orderCode: string) {
    const codes = orderCode.split(',');
    return this.ghnService.getPrintOrderUrl(codes);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nhận Webhook cập nhật trạng thái từ GHN' })
  async webhook(@Body() payload: any) {
    return this.ghnService.handleWebhook(payload);
  }
}
