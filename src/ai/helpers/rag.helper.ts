import { Logger } from '@nestjs/common';

const logger = new Logger('RagHelper');

/**
 * Format price in Vietnamese Dong format.
 */
export function formatPrice(price: number | bigint | null): string {
  if (price === null || price === undefined) return 'Liên hệ';
  const num = Number(price);
  return new Intl.NumberFormat('vi-VN').format(num) + 'đ';
}

/**
 * Perform keyword-based search scoring for products.
 */
export function retrieveRelevantProductsKeyword(message: string, products: any[]): any[] {
  if (!message || !products) return [];
  const normalizedMsg = message.toLowerCase().trim();
  const keywords = normalizedMsg.split(' ').filter((k) => k.length > 1);

  const scoredProducts = products.map((product) => {
    let score = 0;
    const searchString = `${product.name} ${product.brand} ${product.category} ${
      product.subCategory || ''
    }`.toLowerCase();

    if (product.brand && normalizedMsg.includes(product.brand.toLowerCase())) {
      score += 10;
    }
    keywords.forEach((kw) => {
      if (searchString.includes(kw)) score += 2;
    });

    if (normalizedMsg.includes('bán chạy') || normalizedMsg.includes('hot') || normalizedMsg.includes('trend')) {
      if (product.isTrending) score += 5;
    }
    if (normalizedMsg.includes('mới')) {
      if (product.isNew) score += 5;
    }
    if (normalizedMsg.includes('khuyến mãi') || normalizedMsg.includes('giảm giá') || normalizedMsg.includes('sale')) {
      if (product.isSale || (product.salePrice && product.salePrice < product.price)) score += 5;
    }
    if (normalizedMsg.includes('nam') && product.gender === 'men') score += 5;
    if (normalizedMsg.includes('nữ') && product.gender === 'women') score += 5;

    return { ...product, score };
  });

  return scoredProducts.filter((p) => p.score > 0).sort((a, b) => b.score - a.score);
}

/**
 * Combine vector search results and keyword search results using Reciprocal Rank Fusion.
 */
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

/**
 * Enriches retrieved products with GraphRAG related items (same brand/category).
 */
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

/**
 * Evaluates retrieval accuracy (Correct, Ambiguous, Incorrect).
 */
export function evaluateRetrieval(message: string, retrievedProducts: any[]): 'CORRECT' | 'AMBIGUOUS' | 'INCORRECT' {
  if (!retrievedProducts || retrievedProducts.length === 0) return 'INCORRECT';
  const normalized = message.toLowerCase();
  const brands = ['nike', 'adidas', 'puma', 'jordan', 'vans', 'converse'];
  const mentionedBrand = brands.find((b) => normalized.includes(b));

  if (mentionedBrand) {
    const hasBrandProduct = retrievedProducts.some((p) => p.brand?.toLowerCase() === mentionedBrand);
    if (!hasBrandProduct) return 'AMBIGUOUS';
  }
  return 'CORRECT';
}

/**
 * Rewrites user search query for better DB search matching.
 */
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

/**
 * Builds fallback chat response with quick suggestions when AI is offline/busy.
 */
export function buildFallbackReply(products: any[]): string {
  if (!products || products.length === 0) {
    return 'Xin lỗi, AI đang tạm thời quá tải và shop chưa tìm thấy sản phẩm phù hợp. Bạn thử mô tả rõ hơn về hãng, mức giá, loại giày hoặc giới tính để mình gợi ý sát hơn.';
  }

  const suggestions = products
    .slice(0, 3)
    .map((p) => {
      const imageLine = p.image ? `![${p.name}](${p.image})\n` : '';
      return `${imageLine}[${p.name}](/products/${p.id})\nGiá: ${formatPrice(p.price)}\nHãng: ${
        p.brand || 'Khác'
      }`;
    })
    .join('\n\n');

  return `AI đang bận hoặc vượt quota, mình gợi ý nhanh theo dữ liệu sản phẩm hiện có:\n\n${suggestions}\n\nBạn có thể nói thêm ví dụ: "giày chạy bộ nam dưới 2 triệu" để mình lọc sát hơn.`;
}
