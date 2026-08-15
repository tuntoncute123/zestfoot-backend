import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SearchProductsQuery } from '../impl/search-products.query';
import { PrismaService } from '../../../database/prisma.service';

@QueryHandler(SearchProductsQuery)
export class SearchProductsHandler implements IQueryHandler<SearchProductsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(queryDto: SearchProductsQuery) {
    const { query } = queryDto;
    if (!query) return [];

    const products = await this.prisma.product.findMany();

    const normalizedMsg = query.toLowerCase().trim();
    const keywords = normalizedMsg.split(' ').filter(k => k.length > 0);

    const scoredProducts = products.map(product => {
      let score = 0;
      const searchString = `${product.name} ${product.brand || ''} ${product.category || ''} ${product.subCategory || ''}`.toLowerCase();
      
      // Brand match (high weight)
      if (product.brand && normalizedMsg.includes(product.brand.toLowerCase())) {
        score += 10;
      }

      // Keyword match
      keywords.forEach(kw => {
        if (searchString.includes(kw)) {
          score += 2; 
        }
      });

      // Gender logic
      if (normalizedMsg.includes('nam') && product.gender === 'men') score += 5;
      if ((normalizedMsg.includes('nữ') || normalizedMsg.includes('nu')) && product.gender === 'women') score += 5;
      
      // Trending logic
      if (normalizedMsg.includes('hot') || normalizedMsg.includes('trend')) {
        if (product.isTrending) score += 5;
      }

      // Sale logic
      if (normalizedMsg.includes('sale') || normalizedMsg.includes('giảm') || normalizedMsg.includes('khuyến mãi')) {
        const isSalePrice = product.salePrice && product.price && product.salePrice < product.price;
        if (product.isSale || isSalePrice) score += 5;
      }

      return {
        ...product,
        id: product.id.toString(),
        brand_id: product.brand_id ? product.brand_id.toString() : null,
        price: product.price ? Number(product.price) : null,
        costPrice: product.costPrice ? Number(product.costPrice) : null,
        salePrice: product.salePrice ? Number(product.salePrice) : null,
        score,
      };
    });

    return scoredProducts
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score);
  }
}
