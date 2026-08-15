import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProductsQuery } from '../impl/get-products.query';
import { PrismaService } from '../../../database/prisma.service';

@QueryHandler(GetProductsQuery)
export class GetProductsHandler implements IQueryHandler<GetProductsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetProductsQuery) {
    const { limit = 100, offset = 0 } = query;
    const where: any = {};

    if (query.brand) {
      where.brand = { equals: query.brand, mode: 'insensitive' };
    }
    if (query.category) {
      where.category = { equals: query.category, mode: 'insensitive' };
    }
    if (query.gender) {
      where.gender = { equals: query.gender, mode: 'insensitive' };
    }
    if (query.isNew !== undefined) {
      where.isNew = Boolean(query.isNew);
    }
    if (query.isSale !== undefined) {
      where.isSale = Boolean(query.isSale);
    }
    if (query.isTrending !== undefined) {
      where.isTrending = Boolean(query.isTrending);
    }
    if (query.isAsicsExclusive !== undefined) {
      where.isAsicsExclusive = Boolean(query.isAsicsExclusive);
    }

    const products = await this.prisma.product.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { id: 'asc' },
    });

    return products.map(product => ({
      ...product,
      id: product.id.toString(),
      brand_id: product.brand_id ? product.brand_id.toString() : null,
      price: product.price ? Number(product.price) : null,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      salePrice: product.salePrice ? Number(product.salePrice) : null,
    }));
  }
}
