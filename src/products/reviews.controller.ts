import { Controller, Get, Post, Delete, Query, Param, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách đánh giá sản phẩm' })
  @ApiQuery({ name: 'product_id', required: false, type: String, description: 'Lọc theo ID sản phẩm' })
  @ApiQuery({ name: 'sentiment', required: false, type: String, description: 'Lọc theo cảm xúc (positive/neutral/negative)' })
  @ApiResponse({ status: 200, description: 'Danh sách đánh giá kèm thông tin sản phẩm.' })
  async getReviews(
    @Query('product_id') productId?: string,
    @Query('sentiment') sentiment?: string,
  ) {
    return this.productsService.getReviews(productId, sentiment);
  }

  @Get('sentiment-summary')
  @ApiOperation({ summary: 'Tóm tắt ý kiến & cảm xúc khách hàng (AI Ollama)' })
  @ApiResponse({ status: 200, description: 'Tóm tắt khen ngợi, phàn nàn và khuyến nghị.' })
  async getSentimentSummary() {
    return this.productsService.getSentimentSummary();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gửi một đánh giá sản phẩm mới' })
  @ApiResponse({ status: 201, description: 'Đánh giá được tạo thành công.' })
  async createReview(@Body() dto: CreateReviewDto) {
    return this.productsService.createReview(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa đánh giá sản phẩm (Quyền Admin)' })
  @ApiParam({ name: 'id', type: String, description: 'ID đánh giá (UUID)' })
  @ApiResponse({ status: 200, description: 'Xóa đánh giá thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đánh giá.' })
  async deleteReview(@Param('id') id: string) {
    return this.productsService.deleteReview(id);
  }

  @Delete()
  @ApiOperation({ summary: 'Xóa đánh giá sản phẩm bằng query param' })
  @ApiQuery({ name: 'id', type: String, description: 'ID đánh giá' })
  async deleteReviewByQuery(@Query('id') id: string) {
    return this.productsService.deleteReview(id);
  }
}
