import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProductByIdQuery } from '../impl/get-product-by-id.query';
import { PrismaService } from '../../../database/prisma.service';
import { Logger } from '@nestjs/common';

@QueryHandler(GetProductByIdQuery)
export class GetProductByIdHandler implements IQueryHandler<GetProductByIdQuery> {
  private readonly logger = new Logger(GetProductByIdHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetProductByIdQuery) {
    try {
      const { idOrSlug } = query;
      if (!idOrSlug) return null;

      const trimmed = idOrSlug.trim();
      const isNumeric = /^\d+$/.test(trimmed);

      let product: any = null;

      if (isNumeric) {
        try {
          product = await this.prisma.product.findUnique({
            where: { id: BigInt(trimmed) },
            include: { reviews: true },
          });
        } catch (err: any) {
          this.logger.warn(`Error finding product by numeric ID ${trimmed}: ${err.message}`);
          product = await this.prisma.product.findUnique({
            where: { id: BigInt(trimmed) },
          });
        }
      } else {
        // Find by slug. Slugify helper
        const searchSlug = trimmed
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
            ? p.name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/[^a-z0-9\s-]/g, '')
                .trim()
                .replace(/[\s-]+/g, '-')
            : '';
          const brandSlug = p.brand
            ? p.brand
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/[^a-z0-9\s-]/g, '')
                .trim()
                .replace(/[\s-]+/g, '-')
            : '';
          const fullSlug = `${brandSlug}-${nameSlug}`.replace(/^-+|-+$/g, '');
          return { nameSlug, brandSlug, fullSlug };
        };

        // 1. Exact match by nameSlug or fullSlug
        product = allProducts.find((p) => {
          const { nameSlug, fullSlug } = getProductSlugs(p);
          return nameSlug === searchSlug || fullSlug === searchSlug;
        });

        // 2. Partial match
        if (!product) {
          product = allProducts.find((p) => {
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
          product = allProducts.find((p) => {
            const { fullSlug } = getProductSlugs(p);
            return searchTokens.every((token) => fullSlug.includes(token));
          });
        }

        // 4. Any token match (tokens with length > 2)
        if (!product && searchTokens.length > 0) {
          product = allProducts.find((p) => {
            const { fullSlug } = getProductSlugs(p);
            return searchTokens.some((token) => token.length > 2 && fullSlug.includes(token));
          });
        }

        // 5. Brand name fallback match
        if (!product && searchTokens.length > 0) {
          product = allProducts.find((p) => {
            const brand = (p.brand || '').toLowerCase();
            return searchTokens.some((token) => brand.includes(token) || token.includes(brand));
          });
        }

        // 6. Graceful fallback to first product if none found
        if (!product && allProducts.length > 0) {
          product = allProducts[0];
        }

        if (product) {
          try {
            const reviews = await this.prisma.review.findMany({
              where: { product_id: product.id },
            });
            product = { ...product, reviews };
          } catch (reviewErr: any) {
            this.logger.warn(`Could not fetch reviews for product ${product.id}: ${reviewErr.message}`);
            product = { ...product, reviews: [] };
          }
        }
      }

      if (!product) return null;

      const safeReviews = Array.isArray(product.reviews)
        ? product.reviews.map((r: any) => ({
            ...r,
            id: r.id ? r.id.toString() : '',
            product_id: r.product_id ? r.product_id.toString() : null,
          }))
        : [];

      return {
        ...product,
        id: product.id ? product.id.toString() : '',
        brand_id: product.brand_id ? product.brand_id.toString() : null,
        price: product.price ? Number(product.price) : null,
        costPrice: product.costPrice ? Number(product.costPrice) : null,
        salePrice: product.salePrice ? Number(product.salePrice) : null,
        reviews: safeReviews,
      };
    } catch (error: any) {
      this.logger.error(
        `Error in GetProductByIdHandler for query "${query?.idOrSlug}": ${error.message}`,
        error.stack,
      );
      return null;
    }
  }
}
