import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductsController } from './products.controller';
import { BrandsController } from './brands.controller';
import { NewsController } from './news.controller';
import { CouponsController } from './coupons.controller';
import { ReviewsController } from './reviews.controller';
import { GetProductsHandler } from './queries/handlers/get-products.handler';
import { GetProductByIdHandler } from './queries/handlers/get-product-by-id.handler';
import { GetProductsByCollectionHandler } from './queries/handlers/get-products-by-collection.handler';
import { SearchProductsHandler } from './queries/handlers/search-products.handler';
import { CreateProductHandler } from './commands/handlers/create-product.handler';

import { ProductsService } from './products.service';

export const QueryHandlers = [
  GetProductsHandler,
  GetProductByIdHandler,
  GetProductsByCollectionHandler,
  SearchProductsHandler,
];

export const CommandHandlers = [
  CreateProductHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [ProductsController, BrandsController, NewsController, CouponsController, ReviewsController],
  providers: [
    ProductsService,
    ...QueryHandlers,
    ...CommandHandlers,
  ],
  exports: [ProductsService],
})
export class ProductsModule {}
