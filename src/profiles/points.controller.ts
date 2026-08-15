import { Controller, Get, Post, Body, Param, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { QuestDbService } from '../database/questdb.service';
import { AddPointsDto } from './dto/add-points.dto';
import { mapTransactionFields } from '../common/utils/mapping';

@ApiTags('points')
@Controller('points')
export class PointsController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly questDb: QuestDbService,
  ) {}

  @Post('user/:userId')
  @ApiOperation({ summary: 'Cộng hoặc trừ điểm thưởng của tài khoản' })
  @ApiParam({ name: 'userId', type: String, description: 'ID người dùng (UUID)' })
  @ApiResponse({ status: 200, description: 'Điểm thưởng được cập nhật.' })
  async addPoints(@Param('userId', new ParseUUIDPipe()) userId: string, @Body() dto: AddPointsDto) {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(userId)) {
      throw new BadRequestException('Invalid UUID format');
    }
    return this.profilesService.addPoints(userId, dto);
  }

  @Get('user/:userId/transactions')
  @ApiOperation({ summary: 'Lấy danh sách lịch sử tích lũy/sử dụng điểm thưởng' })
  @ApiParam({ name: 'userId', type: String, description: 'ID người dùng (UUID)' })
  @ApiResponse({ status: 200, description: 'Danh sách giao dịch điểm thưởng.' })
  async getTransactions(@Param('userId', new ParseUUIDPipe()) userId: string) {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(userId)) {
      throw new BadRequestException('Invalid UUID format');
    }
    const sql = `SELECT * FROM point_transactions WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 100`;
    const transactions = await this.questDb.querySql(sql);
    return transactions.map(mapTransactionFields);
  }
}
