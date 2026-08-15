import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả bài viết tin tức' })
  @ApiResponse({ status: 200, description: 'Danh sách tin tức.' })
  async getAllNews() {
    return this.productsService.getAllNews();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy bài viết chi tiết theo ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID bài viết' })
  @ApiResponse({ status: 200, description: 'Nội dung chi tiết bài viết.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết.' })
  async getNewsById(@Param('id') id: string) {
    return this.productsService.getNewsById(id);
  }
}
