import { Logger, InternalServerErrorException } from '@nestjs/common';

const logger = new Logger('VoiceHelper');

export interface VoiceParseResult {
  intent: string;
  brand: string | null;
  gender: 'men' | 'women' | 'unisex' | null;
  category: 'shoes' | 'apparel' | 'accessories' | null;
  corrected_text: string;
  target_page: string | null;
}

/**
 * Parses user voice text input into structured JSON instructions using OpenAI.
 */
export async function parseVoiceText(
  openai: any,
  chatModel: string,
  text: string,
): Promise<VoiceParseResult> {
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

    const response = await openai.chat.completions.create({
      model: chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Đoạn text giọng nói của khách hàng: "${text}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const reply = response.choices?.[0]?.message?.content;
    if (!reply) throw new Error('No reply from OpenAI');

    return JSON.parse(reply);
  } catch (error) {
    logger.error('Error parsing voice query:', error);
    throw new InternalServerErrorException('Lỗi xử lý AI giọng nói.');
  }
}
