import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiProperty } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { IsUUID, IsString, IsInt } from 'class-validator';

export class SaveScoreDto {
  @ApiProperty({ description: 'ID người dùng (UUID)', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Tên game (e.g. tetris, snake, shoe-match)', example: 'tetris' })
  @IsString()
  gameName: string;

  @ApiProperty({ description: 'Điểm số đạt được', example: 100 })
  @IsInt()
  score: number;
}


@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('leaderboard')
  @ApiOperation({ summary: 'Lấy bảng xếp hạng game' })
  @ApiQuery({ name: 'gameName', type: String, description: 'Tên game (e.g. lucky-spin, flappy-shoe)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Giới hạn số người chơi (default 50)' })
  @ApiResponse({ status: 200, description: 'Bảng xếp hạng game.' })
  async getLeaderboard(
    @Query('gameName') gameName: string,
    @Query('limit') limit?: number,
  ) {
    return this.profilesService.getLeaderboard(gameName, limit ? Number(limit) : undefined);
  }

  @Post('score')
  @ApiOperation({ summary: 'Lưu điểm số xếp hạng game mới' })
  @ApiResponse({ status: 201, description: 'Điểm số được ghi nhận thành công.' })
  async saveScore(
    @Body() body: SaveScoreDto,
  ) {
    return this.profilesService.saveScore(body.userId, body.gameName, Number(body.score));
  }
}
