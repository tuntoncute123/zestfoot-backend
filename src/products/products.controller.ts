import { Controller, Get, Post, Body, Param, Query, HttpStatus, HttpCode, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả sản phẩm' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng giới hạn' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Số lượng bỏ qua' })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm được lấy thành công.' })
  async getAll(@Query('limit') limit?: number, @Query('offset') offset?: number) {
    return this.productsService.getAllProducts(limit ? Number(limit) : undefined, offset ? Number(offset) : undefined);
  }

  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm sản phẩm theo từ khóa' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Từ khóa tìm kiếm' })
  @ApiResponse({ status: 200, description: 'Kết quả tìm kiếm sản phẩm.' })
  async search(@Query('q') queryStr: string) {
    return this.productsService.searchProducts(queryStr);
  }

  @Get('collection/:slug')
  @ApiOperation({ summary: 'Lấy sản phẩm theo bộ sưu tập / danh mục' })
  @ApiParam({ name: 'slug', type: String, description: 'Slug bộ sưu tập (e.g. giay-nam, sale, doc-quyen)' })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm trong bộ sưu tập.' })
  async getByCollection(@Param('slug') slug: string) {
    return this.productsService.getProductsByCollection(slug);
  }

  @Get('brands')
  @ApiOperation({ summary: 'Lấy danh sách thương hiệu sản phẩm' })
  @ApiResponse({ status: 200, description: 'Danh sách thương hiệu.' })
  async getBrands() {
    return this.productsService.getBrands();
  }

  @Get(':id/combo')
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm gợi ý mua kèm (Combo Bundle)' })
  async getCombo(@Param('id') id: string) {
    return this.productsService.getRecommendedCombo(id);
  }

  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tăng số lượt xem của sản phẩm' })
  async incrementView(@Param('id') id: string) {
    return this.productsService.incrementViews(id);
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm theo ID hoặc Slug' })
  @ApiParam({ name: 'idOrSlug', type: String, description: 'ID số hoặc Slug tên sản phẩm' })
  @ApiResponse({ status: 200, description: 'Chi tiết sản phẩm kèm đánh giá.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm.' })
  async getByIdOrSlug(@Param('idOrSlug') idOrSlug: string) {
    const product = await this.productsService.getProductByIdOrSlug(idOrSlug);
    if (!product) {
      throw new NotFoundException(`Product with ID or Slug "${idOrSlug}" not found`);
    }
    return product;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo một sản phẩm mới' })
  @ApiResponse({ status: 201, description: 'Sản phẩm được tạo thành công.' })
  async create(@Body() dto: CreateProductDto) {
    return this.productsService.createProduct(dto);
  }
}
