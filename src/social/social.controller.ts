import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SocialService } from './social.service';
import { CreatePostDto } from './dto/create-post.dto';
import { ReactPostDto } from './dto/react-post.dto';
import { CommentPostDto } from './dto/comment-post.dto';

@ApiTags('social')
@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('posts')
  @ApiOperation({ summary: 'Lấy danh sách bài đăng bảng tin cộng đồng (kèm reactions & comments)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng bài đăng cần lấy' })
  @ApiQuery({ name: 'user_id', required: false, type: String, description: 'Lọc bài đăng theo user_id' })
  @ApiResponse({ status: 200, description: 'Danh sách bài đăng cộng đồng.' })
  async getPosts(
    @Query('limit') limit?: number,
    @Query('user_id') userId?: string,
  ) {
    return this.socialService.getPosts(limit, userId);
  }

  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Đăng bài viết mới hoặc chia sẻ ảnh Photobooth lên cộng đồng' })
  @ApiResponse({ status: 201, description: 'Bài đăng được tạo thành công.' })
  async createPost(@Body() dto: CreatePostDto) {
    return this.socialService.createPost(dto);
  }

  @Post('posts/:id/react')
  @ApiOperation({ summary: 'Bày tỏ / hủy cảm xúc (hype, sneaker, cop) cho bài viết' })
  @ApiParam({ name: 'id', type: String, description: 'ID bài đăng' })
  @ApiResponse({ status: 200, description: 'Cập nhật cảm xúc thành công.' })
  async toggleReaction(
    @Param('id') postId: string,
    @Body() dto: ReactPostDto,
  ) {
    return this.socialService.toggleReaction(postId, dto);
  }

  @Post('posts/:id/comment')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bình luận vào bài viết' })
  @ApiParam({ name: 'id', type: String, description: 'ID bài đăng' })
  @ApiResponse({ status: 201, description: 'Bình luận được đăng thành công.' })
  async addComment(
    @Param('id') postId: string,
    @Body() dto: CommentPostDto,
  ) {
    return this.socialService.addComment(postId, dto);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Xóa bài đăng' })
  @ApiParam({ name: 'id', type: String, description: 'ID bài đăng' })
  @ApiResponse({ status: 200, description: 'Xóa bài đăng thành công.' })
  async deletePost(@Param('id') postId: string) {
    return this.socialService.deletePost(postId);
  }
}
