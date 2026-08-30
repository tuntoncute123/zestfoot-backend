import { Logger } from '@nestjs/common';

const logger = new Logger('RagHelper');


export function formatPrice(price: number | bigint | null): string {
  if (price === null || price === undefined) return 'Liên hệ';
  const num = Number(price);
  return new Intl.NumberFormat('vi-VN').format(num) + 'đ';
}


export function retrieveRelevantProductsKeyword(message: string, products: any[]): any[] {
  if (!message || !products || products.length === 0) return [];
  const normalizedMsg = message.toLowerCase().trim();
  const keywords = normalizedMsg.split(' ').filter((k) => k.length > 1);

  // Category synonyms mapping
  const categoryAliases: Record<string, string[]> = {
    basketball: ['bóng rổ', 'basketball', 'nba', 'jordan', 'cổ cao', 'high top'],
    running: ['chạy bộ', 'running', 'chạy', 'marathon', 'thể thao', 'êm chân', 'đi bộ'],
    lifestyle: ['thời trang', 'đi chơi', 'casual', 'lifestyle', 'classic', 'streetwear', 'sneaker', 'đi học'],
    skateboarding: ['trượt ván', 'skate', 'skateboarding', 'vans'],
  };

  const brands = ['nike', 'adidas', 'puma', 'asics', 'vans', 'converse', 'jordan'];

  const scoredProducts = products.map((product) => {
    let score = 0;
    const nameLower = (product.name || '').toLowerCase();
    const brandLower = (product.brand || '').toLowerCase();
    const catLower = (product.category || '').toLowerCase();
    const subCatLower = (product.subCategory || '').toLowerCase();
    const searchString = `${nameLower} ${brandLower} ${catLower} ${subCatLower}`;

    // Brand matching (High Priority)
    brands.forEach((brand) => {
      if (normalizedMsg.includes(brand)) {
        if (brandLower.includes(brand) || nameLower.includes(brand)) {
          score += 20;
        }
      }
    });

    // Category synonyms matching
    Object.entries(categoryAliases).forEach(([catKey, aliases]) => {
      const isQueried = aliases.some((alias) => normalizedMsg.includes(alias));
      if (isQueried) {
        if (catLower.includes(catKey) || subCatLower.includes(catKey) || nameLower.includes(catKey)) {
          score += 18;
        }
        // Specific term matches
        aliases.forEach((alias) => {
          if (searchString.includes(alias)) score += 8;
        });
      }
    });

    // General keyword token matching (ignoring generic stop words)
    const stopWords = ['tôi', 'muốn', 'tìm', 'mua', 'cho', 'mình', 'cần', 'xem', 'hỏi', 'có', 'shop', 'không', 'với', 'loại', 'những', 'đôi'];
    keywords.forEach((kw) => {
      if (!stopWords.includes(kw) && searchString.includes(kw)) {
        score += 5;
      }
    });

    // Intent boosts
    if (normalizedMsg.includes('bán chạy') || normalizedMsg.includes('hot') || normalizedMsg.includes('trend')) {
      if (product.isTrending) score += 10;
    }
    if (normalizedMsg.includes('mới') || normalizedMsg.includes('new')) {
      if (product.isNew) score += 10;
    }
    if (normalizedMsg.includes('khuyến mãi') || normalizedMsg.includes('giảm giá') || normalizedMsg.includes('sale')) {
      if (product.isSale || (product.salePrice && product.salePrice < product.price)) score += 12;
    }

    // Gender filter
    if (normalizedMsg.includes('nam') && !normalizedMsg.includes('nữ')) {
      if (product.gender === 'men' || product.gender === 'unisex' || !product.gender) score += 6;
      else score -= 10;
    }
    if (normalizedMsg.includes('nữ')) {
      if (product.gender === 'women' || product.gender === 'unisex' || !product.gender) score += 6;
      else score -= 10;
    }

    // Price range filters
    const currentPrice = Number(product.salePrice || product.price || 0);
    if (normalizedMsg.includes('dưới 1 triệu') || normalizedMsg.includes('dưới 1tr') || normalizedMsg.includes('< 1tr')) {
      if (currentPrice > 0 && currentPrice <= 1000000) score += 15;
    } else if (normalizedMsg.includes('dưới 2 triệu') || normalizedMsg.includes('dưới 2tr') || normalizedMsg.includes('< 2tr')) {
      if (currentPrice > 0 && currentPrice <= 2000000) score += 15;
    } else if (normalizedMsg.includes('trên 2 triệu') || normalizedMsg.includes('trên 2tr') || normalizedMsg.includes('> 2tr')) {
      if (currentPrice >= 2000000) score += 15;
    }

    return { ...product, score };
  });

  return scoredProducts.filter((p) => p.score > 0).sort((a, b) => b.score - a.score);
}


export function reciprocalRankFusion(vectorResults: any[], keywordResults: any[], k = 60): any[] {
  const scores: Record<string, { doc: any; score: number }> = {};
  const applyRRF = (results: any[]) => {
    results.forEach((doc, index) => {
      const docId = String(doc.id);
      const rank = index + 1;
      if (!scores[docId]) {
        scores[docId] = { doc, score: 0 };
      }
      scores[docId].score += 1 / (k + rank);
    });
  };

  applyRRF(vectorResults || []);
  applyRRF(keywordResults || []);

  return Object.values(scores)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.doc);
}


export function enrichWithGraphRelations(fusedProducts: any[], allProducts: any[]): any[] {
  if (!fusedProducts || fusedProducts.length === 0) return [];
  const enriched = [...fusedProducts];
  const existingIds = new Set(fusedProducts.map((p) => p.id));

  fusedProducts.forEach((p) => {
    if (enriched.length >= 7) return;
    const relatives = allProducts.filter(
      (item) =>
        item.id !== p.id &&
        !existingIds.has(item.id) &&
        item.brand === p.brand &&
        item.category === p.category,
    );

    relatives.slice(0, 2).forEach((rel) => {
      if (enriched.length < 7 && !existingIds.has(rel.id)) {
        existingIds.add(rel.id);
        enriched.push({
          ...rel,
          graphRelation: `Liên quan đến ${p.name} vì cùng thương hiệu ${p.brand} và phân loại ${p.category}`,
        });
      }
    });
  });

  return enriched;
}


export function evaluateRetrieval(message: string, retrievedProducts: any[]): 'CORRECT' | 'AMBIGUOUS' | 'INCORRECT' {
  if (!retrievedProducts || retrievedProducts.length === 0) return 'INCORRECT';
  const normalized = (message || '').toLowerCase();
  const brands = ['nike', 'adidas', 'puma', 'jordan', 'vans', 'converse'];
  const mentionedBrand = brands.find((b) => normalized.includes(b));

  if (mentionedBrand) {
    const hasBrandProduct = retrievedProducts.some((p) => p.brand?.toLowerCase() === mentionedBrand);
    if (!hasBrandProduct) return 'AMBIGUOUS';
  }
  return 'CORRECT';
}


export async function rewriteQuery(openai: any, chatModel: string, message: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: chatModel,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content:
            'Bạn là trợ lý Query Rewriter tiếng Việt. Hãy rút gọn hoặc tìm từ đồng nghĩa tối ưu nhất cho câu truy vấn sản phẩm của khách để tìm kiếm trong DB. Ví dụ: \'giay di mua em chan\' -> \'giày chống nước chạy bộ\'. Chỉ trả về chuỗi từ khóa mới, không trả lời gì thêm.',
        },
        { role: 'user', content: message },
      ],
    });
    return response.choices?.[0]?.message?.content?.trim() || message;
  } catch (e) {
    logger.error('Error rewriting query:', e);
    return message;
  }
}


export function buildFallbackReply(products: any[], contextInfo?: string): string {
  if (contextInfo && contextInfo.trim().length > 0) {
    return contextInfo.trim();
  }

  if (!products || products.length === 0) {
    return 'Dạ ZestFoot xin chào bạn! Bạn có thể mô tả cụ thể hơn về mẫu giày bạn đang quan tâm (ví dụ: *giày bóng rổ Nike*, *giày chạy bộ nam*, hoặc *mức giá dưới 2 triệu*) để shop tư vấn chi tiết cho bạn nhé!';
  }

  const suggestions = products
    .slice(0, 4)
    .map((p) => {
      const imageLine = p.image ? `![${p.name}](${p.image})\n` : '';
      const priceText = formatPrice(p.salePrice || p.price);
      return `${imageLine}[${p.name}](/products/${p.id})\n- **Giá**: ${priceText}\n- **Hãng**: ${p.brand || 'ZestFoot'}\n- **Phân loại**: ${p.category || 'Sneaker'}`;
    })
    .join('\n\n');

  return `Chào bạn! Dưới đây là các mẫu giày phù hợp với yêu cầu của bạn tại ZestFoot:\n\n${suggestions}\n\n👉 Bạn có thể bấm trực tiếp vào tên sản phẩm để xem chi tiết hoặc nhắn thêm yêu cầu về size để shop hỗ trợ nhé!`;
}
