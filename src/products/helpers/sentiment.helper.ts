import { Logger } from '@nestjs/common';

const logger = new Logger('SentimentHelper');

export interface ReviewSentimentInput {
  rating: number;
  title: string;
  content: string;
}

export interface ReviewSentimentResult {
  sentiment: string;
  sentiment_score: number;
  sentiment_explanation: string;
}

export interface SentimentSummaryResult {
  praises: string[];
  complaints: string[];
  recommendations: string[];
}

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

/**
 * Analyzes the sentiment of a single review using local Ollama.
 */
export async function analyzeReviewSentiment(
  body: ReviewSentimentInput,
  ollamaUrl: string = OLLAMA_URL,
  ollamaModel: string = OLLAMA_MODEL,
): Promise<ReviewSentimentResult | null> {
  try {
    const prompt = `Bạn là chuyên gia phân tích dữ liệu phản hồi khách hàng. Hãy phân tích sắc thái cảm xúc (Sentiment Analysis) của đánh giá sản phẩm sau:
Tiêu đề: "${body.title}"
Nội dung đánh giá: "${body.content}"
Số sao đánh giá của khách: ${body.rating}/5 sao.

Hãy trả về kết quả dưới dạng một đối tượng JSON duy nhất có định dạng chính xác như sau:
{
  "sentiment": "positive",
  "score": 85,
  "explanation": "Tóm tắt lý do ngắn gọn"
}
Chú ý: chỉ trả về mã JSON, không thêm bất kỳ văn bản nào bên ngoài.`;

    const res = await fetch(`${ollamaUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`Ollama request failed with status ${res.status}`);
    }

    const data = await res.json();
    const responseText = data.choices?.[0]?.message?.content || '';
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    const parsedResult = JSON.parse(cleanJson);

    if (parsedResult.sentiment && typeof (parsedResult.score ?? parsedResult.sentiment_score) === 'number') {
      return {
        sentiment: parsedResult.sentiment,
        sentiment_score: parsedResult.score ?? parsedResult.sentiment_score,
        sentiment_explanation: parsedResult.explanation || parsedResult.sentiment_explanation || 'Phân tích thành công bằng Ollama Local.',
      };
    }
  } catch (error: any) {
    logger.warn(`Ollama sentiment analysis notice: ${error.message}`);
  }
  return null;
}

/**
 * Generates an overall sentiment summary from a list of reviews using local Ollama.
 */
export async function generateSentimentSummary(
  reviews: any[],
  defaultSummary: SentimentSummaryResult,
  ollamaUrl: string = OLLAMA_URL,
  ollamaModel: string = OLLAMA_MODEL,
): Promise<SentimentSummaryResult> {
  try {
    const formattedReviews = reviews
      .map(
        (r, idx) =>
          `${idx + 1}. [Rating: ${r.rating}/5, Cảm xúc: ${r.sentiment || 'Chưa phân tích'}] Tiêu đề: "${
            r.title
          }". Nội dung: "${r.content}"`,
      )
      .join('\n');

    const prompt = `Bạn là giám đốc bộ phận chăm sóc khách hàng của hãng giày ZestFoot. 
Hãy phân tích danh sách các đánh giá sản phẩm từ khách hàng dưới đây để tổng hợp các thông tin chi tiết:

Danh sách đánh giá:
${formattedReviews}

Hãy phản hồi bằng một đối tượng JSON duy nhất có định dạng sau:
{
  "praises": ["Điểm cộng 1", "Điểm cộng 2"],
  "complaints": ["Điểm trừ 1", "Điểm trừ 2"],
  "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"]
}
Chú ý: Phản hồi PHẢI là chuỗi JSON hợp lệ, không chứa thêm bất kỳ bình luận nào bên ngoài. Ngôn ngữ trình bày là tiếng Việt.`;

    const res = await fetch(`${ollamaUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`Ollama request failed with status ${res.status}`);
    }

    const data = await res.json();
    const responseText = data.choices?.[0]?.message?.content || '';
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    const parsedSummary = JSON.parse(cleanJson);

    if (parsedSummary.praises && parsedSummary.complaints && parsedSummary.recommendations) {
      return parsedSummary;
    }
    throw new Error('JSON structure did not match expected schema');
  } catch (error: any) {
    logger.warn(`AI sentiment summary fallback active (${error.message}). Using standard heuristics.`);
    return defaultSummary;
  }
}

