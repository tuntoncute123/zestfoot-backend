import { Logger } from '@nestjs/common';

const logger = new Logger('VoiceHelper');

export interface VoiceParseResult {
  intent: string;
  brand: string | null;
  gender: 'men' | 'women' | 'unisex' | null;
  category: 'shoes' | 'apparel' | 'accessories' | null;
  corrected_text: string;
  target_page: string | null;
}

export function fallbackParseVoice(text: string): VoiceParseResult {
  const lower = (text || '').toLowerCase().trim();

  // 1. Navigation checks
  if (lower.includes('giỏ hàng') || lower.includes('gio hang') || lower.includes('cart')) {
    return { intent: 'navigation', brand: null, gender: null, category: null, corrected_text: 'Mở giỏ hàng', target_page: '/cart' };
  }
  if (lower.includes('thông tin tài khoản') || lower.includes('tài khoản') || lower.includes('tai khoan') || lower.includes('trang cá nhân') || lower.includes('profile')) {
    return { intent: 'navigation', brand: null, gender: null, category: null, corrected_text: 'Thông tin tài khoản', target_page: '/profile' };
  }
  if (lower.includes('yêu thích') || lower.includes('yeu thich') || lower.includes('favorites')) {
    return { intent: 'navigation', brand: null, gender: null, category: null, corrected_text: 'Danh sách yêu thích', target_page: '/favorites' };
  }
  if (lower.includes('đơn hàng') || lower.includes('don hang') || lower.includes('lịch sử mua') || lower.includes('orders')) {
    return { intent: 'navigation', brand: null, gender: null, category: null, corrected_text: 'Đơn hàng của tôi', target_page: '/orders' };
  }
  if (lower.includes('đổi xu') || lower.includes('săn xu') || lower.includes('san xu') || lower.includes('rewards') || lower.includes('vòng quay') || lower.includes('phần thưởng')) {
    return { intent: 'navigation', brand: null, gender: null, category: null, corrected_text: 'Trang săn thưởng & đổi quà', target_page: '/rewards' };
  }
  if (lower.includes('photobooth') || lower.includes('chụp ảnh') || lower.includes('chup anh') || lower.includes('phòng chụp') || lower.includes('thử đồ')) {
    return { intent: 'navigation', brand: null, gender: null, category: null, corrected_text: 'Phòng chụp Photobooth', target_page: '/photobooth' };
  }
  if (lower.includes('bảng tin') || lower.includes('bang tin') || lower.includes('feed') || lower.includes('cộng đồng') || lower.includes('cong dong')) {
    return { intent: 'navigation', brand: null, gender: null, category: null, corrected_text: 'Cộng đồng ZestFoot Feed', target_page: '/feed' };
  }
  if (lower.includes('các hãng') || lower.includes('thương hiệu') || lower.includes('thuong hieu') || lower.includes('tất cả sản phẩm')) {
    return { intent: 'navigation', brand: null, gender: null, category: null, corrected_text: 'Tất cả thương hiệu', target_page: '/collections/all' };
  }
  if (lower.includes('trang chủ') || lower.includes('trang chu') || lower.includes('về trang chủ') || lower.includes('home page')) {
    return { intent: 'navigation', brand: null, gender: null, category: null, corrected_text: 'Về trang chủ', target_page: '/' };
  }

  // 2. Brand detection
  let detectedBrand: string | null = null;
  if (/nike|nai\s*kì|naiki|nai\s*ki/i.test(lower)) detectedBrand = 'NIKE';
  else if (/adidas|a\s*đi\s*đát|a\s*đi\s*đas|adida|adadas/i.test(lower)) detectedBrand = 'ADIDAS';
  else if (/puma|pu\s*ma/i.test(lower)) detectedBrand = 'PUMA';
  else if (/asics|a\s*síc|a\s*sic/i.test(lower)) detectedBrand = 'ASICS';
  else if (/jordan|dót\s*đần|dốt\s*đần|dordan/i.test(lower)) detectedBrand = 'JORDAN';
  else if (/new\s*balance|niu\s*ba\s*lăng|\bnb\b/i.test(lower)) detectedBrand = 'NEW BALANCE';
  else if (/converse|công\s*vớt|con\s*vớt/i.test(lower)) detectedBrand = 'CONVERSE';
  else if (/crocs|cờ\s*róc|croc/i.test(lower)) detectedBrand = 'CROCS';
  else if (/fila|phi\s*la/i.test(lower)) detectedBrand = 'FILA';
  else if (/vans|van\b/i.test(lower)) detectedBrand = 'VANS';
  else if (/mizuno/i.test(lower)) detectedBrand = 'MIZUNO';
  else if (/reebok|ri\s*bốc/i.test(lower)) detectedBrand = 'REEBOK';

  // 3. Gender detection
  let detectedGender: 'men' | 'women' | 'unisex' | null = null;
  if (/nam|con trai|đàn ông|nam giới/i.test(lower) && !/nữ/i.test(lower)) {
    detectedGender = 'men';
  } else if (/nữ|con gái|phụ nữ|nữ giới/i.test(lower)) {
    detectedGender = 'women';
  } else if (/unisex/i.test(lower)) {
    detectedGender = 'unisex';
  }

  // 4. Category detection
  let detectedCategory: 'shoes' | 'apparel' | 'accessories' | null = null;
  if (/giày|dép|sneaker|sandal|guốc|boots|boot|chạy bộ|thể thao/i.test(lower)) {
    detectedCategory = 'shoes';
  } else if (/áo|quần|hoodie|jacket|áo khoác|áo thun|tee|short/i.test(lower)) {
    detectedCategory = 'apparel';
  } else if (/túi|balo|nón|mũ|vớ|tất|phụ kiện/i.test(lower)) {
    detectedCategory = 'accessories';
  }

  // 5. Intent detection
  let intent = 'search_text';
  if (/rẻ nhất|giá rẻ|ít tiền|gẻ nhất|thấp nhất|re nhat|gia re/i.test(lower)) {
    intent = 'cheapest';
  } else if (/đắt nhất|xịn nhất|cao cấp|mắc nhất|giá cao|đắt tiền|dat nhat|mac nhat/i.test(lower)) {
    intent = 'expensive';
  } else if (/mới nhất|mới về|hàng mới|moi nhat|hang moi/i.test(lower)) {
    intent = 'newest';
  } else if (/giảm giá|sale|khuyến mãi|ưu đãi|hạ giá|deal|giam gia/i.test(lower)) {
    intent = 'sale';
  } else if (detectedBrand) {
    intent = 'brand';
  } else if (detectedGender) {
    intent = 'gender';
  }

  return {
    intent,
    brand: detectedBrand,
    gender: detectedGender,
    category: detectedCategory,
    corrected_text: text,
    target_page: null,
  };
}

export async function parseVoiceText(
  openai: any,
  chatModel: string,
  text: string,
): Promise<VoiceParseResult> {
  if (!text || !text.trim()) {
    return {
      intent: 'unknown',
      brand: null,
      gender: null,
      category: null,
      corrected_text: '',
      target_page: null,
    };
  }

  if (!openai) {
    return fallbackParseVoice(text);
  }

  try {
    const systemPrompt = `
Bạn là hệ thống xử lý giọng nói thông minh cho website bán giày ZestFoot (cửa hàng giày dép, quần áo và phụ kiện).
Nhiệm vụ của bạn là nhận vào đoạn văn bản thô (có thể bị viết sai chính tả, nói ngọng, thiếu từ hoặc không rõ ràng do công cụ nhận diện giọng nói tiếng Việt nhận dạng sai) và phân tích ý định của khách hàng rồi chuyển nó thành cấu trúc JSON.

Các ý định (intent) được hỗ trợ:
1. "cheapest": Tìm sản phẩm rẻ nhất / giá thấp nhất (ví dụ: "tìm đôi rẻ nhất", "cho xem giày giá rẻ", "đôi nào rẻ nhất", "gẻ nhất", "dép rẻ", "giá thấp nhất").
2. "expensive": Tìm sản phẩm đắt nhất / cao cấp nhất / giá cao nhất (ví dụ: "giày đắt nhất", "đôi nào xịn nhất", "giá cao nhất", "đắt tiền", "mắc nhất").
3. "newest": Tìm sản phẩm mới nhất / hàng mới về (ví dụ: "giày mới nhất", "hàng mới", "mới về", "có gì mới không").
4. "sale": Tìm sản phẩm đang giảm giá / khuyến mãi (ví dụ: "đang sale", "giảm giá", "khuyến mãi", "đôi nào giảm giá", "hạ giá").
5. "brand": Tìm kiếm theo thương hiệu cụ thể (ví dụ: "giày nike", "cho xem puma", "đôi adidas", "asics").
6. "gender": Tìm kiếm theo giới tính (ví dụ: "giày nam", "giày nữ", "cho con gái", "cho nam giới").
7. "navigation": Điều hướng đến các trang chức năng (ví dụ: "vào giỏ hàng", "mở giỏ hàng", "trang cá nhân", "thông tin tài khoản", "lịch sử đơn hàng", "đơn hàng của tôi", "danh sách yêu thích", "giày yêu thích", "đổi xu", "săn xu", " rewards", "phòng thử đồ", "chụp ảnh", "photobooth", "bảng tin", "feed", "về trang chủ", "home page").
8. "search_text": Các truy vấn tìm kiếm sản phẩm thông thường khác (ví dụ: "giày chạy bộ", "dép lê màu đen", "sneaker cổ cao", "áo hoodie").
9. "unknown": Không hiểu hoặc không liên quan đến cửa hàng giày dép (ví dụ: "thời tiết hôm nay", "tin tức thời sự").

Hãy phân tích kỹ và trả về một đối tượng JSON có định dạng sau:
{
  "intent": "cheapest" | "expensive" | "newest" | "sale" | "brand" | "gender" | "navigation" | "search_text" | "unknown",
  "brand": "Tên thương hiệu viết hoa chuẩn (ví dụ: NIKE, ADIDAS, PUMA, ASICS, JORDAN, NEW BALANCE, CONVERSE, CROCS, FILA) nếu khách hàng có nhắc đến, ngược lại là null. Ví dụ: 'nike' -> 'NIKE', 'a đi đát' -> 'ADIDAS', 'nai kì' -> 'NIKE'",
  "gender": "men" | "women" | "unisex" | null,
  "category": "shoes" | "apparel" | "accessories" | null,
  "corrected_text": "Câu tiếng Việt hoàn chỉnh đã được sửa lỗi chính tả và làm rõ nghĩa",
  "target_page": "Chỉ được phép là một trong các đường dẫn chính xác sau: '/' (Trang chủ), '/cart' (Giỏ hàng), '/profile' (Thông tin tài khoản), '/favorites' (Sản phẩm yêu thích), '/orders' (Đơn hàng của tôi), '/rewards' (Trang rewards/săn xu), '/photobooth' (Trang Photobooth), '/feed' (Bảng tin/Feed), '/collections/all' (Trang xem thương hiệu/tất cả sản phẩm - dùng khi khách hỏi 'xem các hãng', 'thương hiệu', 'tất cả sản phẩm', 'các hãng'). Tuyệt đối không tự ý tạo ra đường dẫn khác (ví dụ: không trả về '/brands', '/Home/thuong-hieu'). Nếu không thuộc danh sách này, giá trị phải là null."
}

Chú ý: Trả về một đối tượng JSON hợp lệ duy nhất. Không thêm bất kỳ văn bản nào ngoài JSON.
`;

    // Timeout after 3.5 seconds to prevent proxy socket hang up
    const aiPromise = openai.chat.completions.create({
      model: chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Đoạn text giọng nói của khách hàng: "${text}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI parse-voice timeout')), 3500)
    );

    const response: any = await Promise.race([aiPromise, timeoutPromise]);
    const reply = response.choices?.[0]?.message?.content;
    if (!reply) throw new Error('No reply from OpenAI');

    const parsed = JSON.parse(reply);
    return {
      intent: parsed.intent || 'search_text',
      brand: parsed.brand || null,
      gender: parsed.gender || null,
      category: parsed.category || null,
      corrected_text: parsed.corrected_text || text,
      target_page: parsed.target_page || null,
    };
  } catch (error) {
    logger.warn(`AI Voice parse LLM unavailable or timed out: ${error?.message || error}. Falling back to rule-based parser.`);
    return fallbackParseVoice(text);
  }
}
