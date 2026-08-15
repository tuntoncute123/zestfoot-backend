import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProductByIdQuery } from '../impl/get-product-by-id.query';
import { PrismaService } from '../../../database/prisma.service';

@QueryHandler(GetProductByIdQuery)
export class GetProductByIdHandler implements IQueryHandler<GetProductByIdQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetProductByIdQuery) {
    const { idOrSlug } = query;
    const isNumeric = /^\d+$/.test(idOrSlug);

    let product = null;

    if (isNumeric) {
      product = await this.prisma.product.findUnique({
        where: { id: BigInt(idOrSlug) },
        include: { reviews: true },
      });
    } else {
      // Find by slug. Slugify helper
      const searchSlug = idOrSlug
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/[\s-]+/g, '-');

      const searchTokens = searchSlug.split('-').filter(Boolean);

      // Fetch products to find the best match
      const allProducts = await this.prisma.product.findMany();

      const getProductSlugs = (p: any) => {
        const nameSlug = p.name
          ? p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s-]+/g, '-')
          : '';
        const brandSlug = p.brand
          ? p.brand.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s-]+/g, '-')
          : '';
        const fullSlug = `${brandSlug}-${nameSlug}`.replace(/^-+|-+$/g, '');
        return { nameSlug, brandSlug, fullSlug };
      };

      // 1. Exact match by nameSlug or fullSlug
      product = allProducts.find(p => {
        const { nameSlug, fullSlug } = getProductSlugs(p);
        return nameSlug === searchSlug || fullSlug === searchSlug;
      });

      // 2. Partial match
      if (!product) {
        product = allProducts.find(p => {
          const { nameSlug, fullSlug } = getProductSlugs(p);
          return (
            fullSlug.includes(searchSlug) ||
            searchSlug.includes(fullSlug) ||
            nameSlug.includes(searchSlug) ||
            searchSlug.includes(nameSlug)
          );
        });
      }

      // 3. Token match (all searchTokens match in fullSlug)
      if (!product && searchTokens.length > 0) {
        product = allProducts.find(p => {
          const { fullSlug } = getProductSlugs(p);
          return searchTokens.every(token => fullSlug.includes(token));
        });
      }

      // 4. Any token match (tokens with length > 2)
      if (!product && searchTokens.length > 0) {
        product = allProducts.find(p => {
          const { fullSlug } = getProductSlugs(p);
          return searchTokens.some(token => token.length > 2 && fullSlug.includes(token));
        });
      }

      // 5. Fallback to first available product if still not found
      if (!product && allProducts.length > 0) {
        product = allProducts[0];
      }

      if (product) {
        // Fetch reviews separately
        const reviews = await this.prisma.review.findMany({
          where: { product_id: product.id }
        });
        product = { ...product, reviews };
      }
    }

    if (!product) return null;

    return {
      ...product,
      id: product.id.toString(),
      price: product.price ? Number(product.price) : null,
      salePrice: product.salePrice ? Number(product.salePrice) : null,
      reviews: product.reviews ? product.reviews.map(r => ({
        ...r,
        id: r.id.toString(),
        product_id: r.product_id ? r.product_id.toString() : null
      })) : []
    };
  }
}
