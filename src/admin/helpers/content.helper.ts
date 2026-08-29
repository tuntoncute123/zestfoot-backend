export function buildAutoContentPrompt(product: any, couponText: string): string {
  const genderLabel = product.gender === 'men' ? 'Nam' : (product.gender === 'women' ? 'Nữ' : 'Unisex/Cả nam và nữ');
  const statusLabels = [];
  if (product.isTrending) statusLabels.push('Xu hướng hot (Trending)');
  if (product.isNew) statusLabels.push('Hàng mới về (New Arrival)');
  if (product.isSale) statusLabels.push('Đang giảm giá (On Sale)');
  const statusText = statusLabels.length > 0 ? statusLabels.join(', ') : 'Sản phẩm tiêu chuẩn';

  return `Bạn là một chuyên gia Content Marketing chuyên nghiệp cho thương hiệu giày thể thao ZestFoot.
Nhiệm vụ của bạn là:
1. Viết một bài viết quảng cáo chất lượng cao (cho Blog) và một dòng trạng thái ngắn thu hút (cho Mạng xã hội/Cộng đồng) để giới thiệu sản phẩm dưới đây.
2. Vẽ/Tạo một bức ảnh quảng cáo nghệ thuật chất lượng cao (bằng cách kích hoạt công cụ vẽ tranh Imagen của bạn) minh họa cận cảnh đôi giày này để đăng kèm bài viết. Bức ảnh mô tả đôi giày ${product.name} của hãng ${product.brand} được chụp chuyên nghiệp trong studio hoặc bối cảnh đường phố năng động thời thượng.

Thông tin sản phẩm mục tiêu:
Tên sản phẩm: ${product.name}
Hãng sản xuất: ${product.brand}
Nhóm đối tượng/Giới tính: ${genderLabel}
Phân loại/Trạng thái: ${statusText}
Mô tả chi tiết: Giày thể thao cao cấp, thiết kế hiện đại, êm ái, hỗ trợ vận động tối ưu.
Giá bán gốc: ${product.price ? Number(product.price).toLocaleString('vi-VN') + 'đ' : 'Liên hệ'}
${product.salePrice ? `Giá khuyến mãi hiện tại: ${Number(product.salePrice).toLocaleString('vi-VN')}đ` : ''}

${couponText ? `Các mã giảm giá đang hoạt động của shop (hãy khéo léo chèn vào bài viết): ${couponText}` : ''}

Yêu cầu nội dung:
- Tiêu đề blog phải giật tít thu hút nhóm đối tượng phù hợp (${genderLabel}), chuẩn SEO.
- Nội dung blog phải tận dụng tối đa các trạng thái sản phẩm như: ${statusText} để kêu gọi hành động mua hàng.
- Viết văn phong lôi cuốn, chuyên nghiệp, cấu trúc Markdown chuẩn mực.

Hãy trả về một đối tượng JSON duy nhất có định dạng chính xác như sau:
{
  "blog_title": "Tiêu đề bài viết Blog cực kỳ thu hút, giật tít chuyên nghiệp, chuẩn SEO",
  "blog_excerpt": "Một đoạn tóm tắt ngắn khoảng 2-3 câu (dưới 150 ký tự) tóm tắt bài viết Blog để hiển thị ngoài danh sách tin tức",
  "blog_content": "Nội dung bài viết Blog đầy đủ bằng tiếng Việt (viết dưới dạng Markdown). Bài viết cần phân tích sâu sắc về thiết kế, công nghệ, trải nghiệm đi lên chân, hướng dẫn phối đồ và khuyến khích người mua nhanh chóng đặt hàng, có thể tận dụng các mã giảm giá được cung cấp nếu có. Bài viết phải có cấu trúc rõ ràng với các thẻ tiêu đề (dùng #, ##), danh sách gạch đầu dòng, ngôn từ sôi nổi và kích thích mua sắm.",
  "social_caption": "Dòng caption ngắn gọn nhưng cực kỳ ấn tượng, có chứa nhiều emoji sinh động và các hashtag liên quan như #ZestFoot #giaythethao #hotrend... để đăng lên bảng tin cộng đồng, thúc đẩy người dùng tương tác thả tim hoặc truy cập blog."
}

Chú ý quan trọng: 
- Bạn PHẢI kích hoạt chức năng vẽ tranh của mình để tạo hình ảnh minh họa.
- Phản hồi bằng văn bản PHẢI là chuỗi JSON hợp lệ, bằng tiếng Việt chuẩn UTF-8, không bị lỗi font chữ. Hãy chỉ trả về chuỗi JSON thô, không thêm bất kỳ văn bản giải thích nào khác ngoài JSON.
- Cấm tuyệt đối sử dụng các ký tự xuống dòng thực tế (raw newlines) bên trong các chuỗi JSON của bạn. Hãy thoát các ký tự xuống dòng bằng cách viết dưới dạng '\\n' trong chuỗi blog_content.`;
}

export function cleanAndParseAutoContent(responseText: string): any {
  responseText = responseText.trim();
  const startIdx = responseText.indexOf('{');
  const endIdx = responseText.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    responseText = responseText.substring(startIdx, endIdx + 1);
  }

  let inString = false;
  let escaped = false;
  let result = '';
  for (let i = 0; i < responseText.length; i++) {
    const char = responseText[i];
    if (char === '"' && !escaped) inString = !inString;
    if (inString) {
      if (char === '\n') result += '\\n';
      else if (char === '\r') result += '\\r';
      else if (char === '\t') result += '\\t';
      else result += char;
    } else {
      result += char;
    }
    escaped = (char === '\\' && !escaped);
  }

  return JSON.parse(result);
}

export function getFallbackAutoContent(product: any): any {
  return {
    blog_title: `Giới thiệu siêu phẩm ${product.name} từ thương hiệu ${product.brand}`,
    blog_excerpt: `Khám phá ngay đôi giày thể thao ${product.name} chất lượng cao, mang lại trải nghiệm êm ái tuyệt vời.`,
    blog_content: `### Thiết kế năng động, thời thượng\n\nĐôi giày **${product.name}** của thương hiệu **${product.brand}** là sự kết hợp hoàn hảo giữa thời trang và hiệu năng. Sử dụng chất liệu cao cấp thoáng khí, đôi giày này mang lại sự thoải mái tối đa cho cả ngày dài vận động.\n\n### Công nghệ đệm êm ái vượt trội\n\nĐược trang bị công nghệ đế tiên tiến nhất, hỗ trợ giảm chấn rung cực tốt, bảo vệ đôi chân của bạn trên mọi cung đường chạy bộ hay dạo phố.`,
    social_caption: `Siêu phẩm ${product.name} đã cập bến ZestFoot! Thiết kế thời thượng, êm ái nâng niu từng bước chân. Mua ngay hôm nay! #ZestFoot #giaythethao #${product.brand}`,
  };
}
