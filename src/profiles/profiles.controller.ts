import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AddPointsDto } from './dto/add-points.dto';
import { SpinLuckyWheelDto } from './dto/spin-lucky-wheel.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin tài khoản người dùng kèm lịch sử tích lũy/sử dụng điểm' })
  @ApiParam({ name: 'id', type: String, description: 'ID người dùng (UUID)' })
  @ApiResponse({ status: 200, description: 'Thông tin tài khoản kèm lịch sử giao dịch điểm từ QuestDB.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài khoản.' })
  async getProfile(@Param('id') id: string) {
    return this.profilesService.getProfile(id);
  }

  @Post(':id/points')
  @ApiOperation({ summary: 'Cộng hoặc trừ điểm thưởng của tài khoản' })
  @ApiParam({ name: 'id', type: String, description: 'ID người dùng (UUID)' })
  @ApiResponse({ status: 200, description: 'Điểm thưởng được cập nhật và giao dịch được lưu vào QuestDB.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài khoản.' })
  async addPoints(@Param('id') id: string, @Body() dto: AddPointsDto) {
    return this.profilesService.addPoints(id, dto);
  }

  @Post(':id/spin')
  @ApiOperation({ summary: 'Quay vòng quay may mắn' })
  @ApiParam({ name: 'id', type: String, description: 'ID người dùng (UUID)' })
  @ApiResponse({ status: 200, description: 'Thực hiện lượt quay, trừ vé quay, trao giải thưởng và lưu lịch sử trúng thưởng.' })
  @ApiResponse({ status: 400, description: 'Không đủ vé quay hoặc giải thưởng chưa cấu hình.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài khoản.' })
  async spinLuckyWheel(@Param('id') id: string, @Body() dto: SpinLuckyWheelDto) {
    return this.profilesService.spinLuckyWheel(id, dto.userName);
  }
}

