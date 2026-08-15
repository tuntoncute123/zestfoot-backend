import { Controller, Get, Put, Body, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tài khoản người dùng kèm phân trang và tìm kiếm' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Danh sách tài khoản khớp điều kiện.' })
  async getProfiles(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('size') size?: number,
  ) {
    return this.profilesService.getProfiles(search, page ? Number(page) : 1, size ? Number(size) : 10);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin tài khoản người dùng' })
  @ApiParam({ name: 'id', type: String, description: 'ID người dùng (UUID)' })
  @ApiResponse({ status: 200, description: 'Thông tin người dùng kèm lịch sử điểm và vouchers.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài khoản.' })
  async getUser(@Param('id') id: string) {
    const profile = await this.profilesService.getProfile(id);
    if (!profile) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return profile;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin tài khoản người dùng' })
  @ApiParam({ name: 'id', type: String, description: 'ID người dùng (UUID)' })
  @ApiResponse({ status: 200, description: 'Cập nhật tài khoản thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài khoản.' })
  async updateUser(@Param('id') id: string, @Body() data: any) {
    return this.profilesService.updateProfile(id, data);
  }
}
