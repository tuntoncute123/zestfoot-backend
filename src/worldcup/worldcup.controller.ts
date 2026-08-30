import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorldCupService } from './worldcup.service';
import { VerifyTokenDto, SpinDto, ClaimShoeDto } from './dto/worldcup.dto';

@ApiTags('worldcup')
@Controller('worldcup')
export class WorldCupController {
  constructor(private readonly worldCupService: WorldCupService) {}

  @Get('prizes')
  @ApiOperation({ summary: 'Lấy cơ cấu giải thưởng, lịch sử trúng thưởng và bảng xếp hạng huy hiệu World Cup' })
  @ApiResponse({ status: 200, description: 'Danh sách giải thưởng, lịch sử lượt quay gần nhất, người thắng cuộc và BXH thu thập huy hiệu.' })
  async getPrizesAndHistory() {
    return this.worldCupService.getPrizesAndHistory();
  }

  @Post('verify-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kiểm tra tính hợp lệ của mã vé dự thưởng World Cup' })
  @ApiResponse({ status: 200, description: 'Trạng thái hợp lệ kèm chi tiết mã vé hoặc thông tin lỗi nếu không hợp lệ.' })
  async verifyToken(@Body() body: VerifyTokenDto) {
    return this.worldCupService.verifyToken(body.token);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kiểm tra tính hợp lệ của mã vé dự thưởng World Cup (Alias)' })
  @ApiResponse({ status: 200, description: 'Trạng thái hợp lệ kèm chi tiết mã vé hoặc thông tin lỗi nếu không hợp lệ.' })
  async verifyTokenAlias(@Body() body: VerifyTokenDto) {
    return this.worldCupService.verifyToken(body.token);
  }

  @Post('spin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Thực hiện sút phạt đền (lượt quay) World Cup đổi thưởng' })
  @ApiResponse({ status: 200, description: 'Kết quả lượt sút (trúng giải thưởng voucher hoặc nhận huy hiệu ngẫu nhiên).' })
  @ApiResponse({ status: 400, description: 'Mã vé không hợp lệ hoặc đã sử dụng trước đó.' })
  @ApiResponse({ status: 404, description: 'Tài khoản người chơi không tồn tại.' })
  async spin(@Body() body: SpinDto) {
    return this.worldCupService.spin(body.token, body.userId);
  }

  @Post('claim-shoe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đổi thưởng giày giới hạn World Cup 2026 khi thu thập đủ 48 huy hiệu' })
  @ApiResponse({ status: 200, description: 'Tạo đơn hàng miễn phí cho giày thưởng và ghi nhận yêu cầu thành công.' })
  @ApiResponse({ status: 400, description: 'Người chơi chưa tích lũy đủ 48 huy hiệu hoặc đã đổi thưởng trước đó.' })
  @ApiResponse({ status: 404, description: 'Tài khoản người chơi không tồn tại.' })
  async claimShoe(@Body() body: ClaimShoeDto) {
    return this.worldCupService.claimShoe(
      body.userId,
      body.size,
      body.fullName,
      body.phone,
      body.address,
    );
  }
}
