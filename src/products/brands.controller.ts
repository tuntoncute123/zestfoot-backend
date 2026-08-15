import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thương hiệu sản phẩm' })
  @ApiResponse({ status: 200, description: 'Danh sách thương hiệu.' })
  async getBrands() {
    return this.productsService.getBrands();
  }
}
