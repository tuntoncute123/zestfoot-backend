import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProductsQuery } from '../impl/get-products.query';
import { PrismaService } from '../../../database/prisma.service';

@QueryHandler(GetProductsQuery)
export class GetProductsHandler implements IQueryHandler<GetProductsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetProductsQuery) {
    const { limit = 100, offset = 0 } = query;
    const products = await this.prisma.product.findMany({
      take: limit,
      skip: offset,
    });

    return products.map(product => ({
      ...product,
      id: product.id.toString(),
      price: product.price ? Number(product.price) : null,
      salePrice: product.salePrice ? Number(product.salePrice) : null,
    }));
  }
}
