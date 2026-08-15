import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProductsByCollectionQuery } from '../impl/get-products-by-collection.query';
import { PrismaService } from '../../../database/prisma.service';

@QueryHandler(GetProductsByCollectionQuery)
export class GetProductsByCollectionHandler implements IQueryHandler<GetProductsByCollectionQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetProductsByCollectionQuery) {
    const slug = query.slug ? query.slug.toLowerCase() : 'all';
    
    let products = await this.prisma.product.findMany();

    let mapped = products.map(product => ({
      ...product,
      id: product.id.toString(),
      brand_id: product.brand_id ? product.brand_id.toString() : null,
      price: product.price ? Number(product.price) : null,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      salePrice: product.salePrice ? Number(product.salePrice) : null,
    }));

    if (slug === 'all') {
      return mapped;
    }

    if (slug === 'giay-nu') {
      return mapped.filter(p => p.gender === 'women' && p.category === 'shoes');
    }
    if (slug === 'giay-nam') {
      return mapped.filter(p => p.gender === 'men' && p.category === 'shoes');
    }
    if (slug === 'quan-ao' || slug === 'phu-trang') {
      return mapped.filter(p => p.category === 'apparel');
    }
    if (slug === 'phu-kien' || slug === 'phu-kien1') {
      return mapped.filter(p => p.category !== 'shoes' && p.category !== 'apparel');
    }

    // Sub-category filters
    if (slug.includes('giay-the-thao')) {
      const gender = slug.includes('nu') ? 'women' : (slug.includes('nam') ? 'men' : null);
      return mapped.filter(p => {
        if (gender && p.gender !== gender) return false;
        if (p.category !== 'shoes') return false;
        const nameHigh = p.name.toLowerCase();
        const sub = p.subCategory ? p.subCategory.toLowerCase() : '';
        const isExplicitSneaker = sub === 'sneaker' || nameHigh.includes('sneaker') || nameHigh.includes('thể thao') || nameHigh.includes('running') || nameHigh.includes('walking');
        const isOtherType = nameHigh.includes('sandal') || nameHigh.includes('xăng đan') || nameHigh.includes('dép') || nameHigh.includes('slide') || nameHigh.includes('da ') || nameHigh.includes('tây') || nameHigh.includes('boot') || nameHigh.includes('loafer');
        return isExplicitSneaker || (!sub && !isOtherType);
      });
    }

    if (slug.includes('giay-xang-dan')) {
      const gender = slug.includes('nu') ? 'women' : (slug.includes('nam') ? 'men' : null);
      return mapped.filter(p => {
        if (gender && p.gender !== gender) return false;
        if (p.category !== 'shoes') return false;
        const nameHigh = p.name.toLowerCase();
        const sub = p.subCategory ? p.subCategory.toLowerCase() : '';
        return sub === 'sandal' || nameHigh.includes('sandal') || nameHigh.includes('xăng đan');
      });
    }

    if (slug.includes('dep')) {
      const gender = slug.includes('nu') ? 'women' : (slug.includes('nam') ? 'men' : null);
      return mapped.filter(p => {
        if (gender && p.gender !== gender) return false;
        if (p.category !== 'shoes') return false;
        const nameHigh = p.name.toLowerCase();
        const sub = p.subCategory ? p.subCategory.toLowerCase() : '';
        return sub === 'slipper' || sub === 'slide' || nameHigh.includes('dép') || nameHigh.includes('slide');
      });
    }

    if (slug.includes('giay-da')) {
      const gender = slug.includes('nu') ? 'women' : (slug.includes('nam') ? 'men' : null);
      return mapped.filter(p => {
        if (gender && p.gender !== gender) return false;
        if (p.category !== 'shoes') return false;
        const nameHigh = p.name.toLowerCase();
        const sub = p.subCategory ? p.subCategory.toLowerCase() : '';
        return sub === 'formal' || nameHigh.includes('giày da') || nameHigh.includes('business') || nameHigh.includes('loafer') || nameHigh.includes('boot') || nameHigh.includes('tây');
      });
    }

    if (slug === 'ao') {
      return mapped.filter(p => {
        if (p.category !== 'apparel') return false;
        const nameHigh = p.name.toLowerCase();
        const sub = p.subCategory ? p.subCategory.toLowerCase() : '';
        return sub === 'shirt' || sub === 'top' || nameHigh.includes('áo') || nameHigh.includes('hoodie') || nameHigh.includes('jacket') || nameHigh.includes('tee');
      });
    }

    if (slug === 'quan') {
      return mapped.filter(p => {
        if (p.category !== 'apparel') return false;
        const nameHigh = p.name.toLowerCase();
        const sub = p.subCategory ? p.subCategory.toLowerCase() : '';
        return sub === 'pant' || sub === 'bottom' || nameHigh.includes('quần') || nameHigh.includes('short') || nameHigh.includes('legging');
      });
    }

    if (slug === 'day-giay') {
      return mapped.filter(p => p.name.toLowerCase().includes('dây') || (p.subCategory && p.subCategory.toLowerCase() === 'shoelace'));
    }

    if (slug === 'tui') {
      return mapped.filter(p => {
        const sub = p.subCategory ? p.subCategory.toLowerCase() : '';
        const nameHigh = p.name.toLowerCase();
        return sub === 'bag' || nameHigh.includes('balo') || nameHigh.includes('túi');
      });
    }

    if (slug === 'non') {
      return mapped.filter(p => {
        const sub = p.subCategory ? p.subCategory.toLowerCase() : '';
        const nameHigh = p.name.toLowerCase();
        return sub === 'hat' || nameHigh.includes('nón') || nameHigh.includes('mũ');
      });
    }

    if (slug === 'vo') {
      return mapped.filter(p => {
        const sub = p.subCategory ? p.subCategory.toLowerCase() : '';
        const nameHigh = p.name.toLowerCase();
        return sub === 'socks' || nameHigh.includes('vớ') || nameHigh.includes('tất');
      });
    }

    if (slug === 'chay-bo') {
      return mapped.filter(p => p.category === 'shoes' && (p.name.toLowerCase().includes('running') || p.name.toLowerCase().includes('chạy')));
    }

    if (slug === 'cham-soc-giay') {
      return mapped.filter(p => p.category === 'care');
    }

    if (slug === 'sale') {
      return mapped.filter(p => p.isSale || (p.salePrice && p.salePrice < p.price));
    }

    if (slug === 'new' || slug === 'new-arrivals') {
      return mapped.filter(p => p.isNew);
    }

    if (slug === 'trending') {
      return mapped.filter(p => p.isTrending);
    }

    if (slug === 'doc-quyen') {
      return mapped.filter(p => {
        if (p.isAsicsExclusive) return true;
        const badgesArr = p.badges ? (Array.isArray(p.badges) ? p.badges : []) : [];
        return badgesArr.includes('EXCLUSIVE');
      });
    if (slug === 'asics' || slug === 'asics-lifewalker' || slug === 'lifewalker') {
      return mapped.filter(p => (p.brand && p.brand.toLowerCase() === 'asics') || p.isAsicsExclusive || (p.name && p.name.toLowerCase().includes('lifewalker')));
    }

    // Brand match fallback
    const brandMatch = mapped.filter(p => p.brand && p.brand.toLowerCase().replace(/\s+/g, '-') === slug);
    if (brandMatch.length > 0) return brandMatch;

    return [];
  }
}
