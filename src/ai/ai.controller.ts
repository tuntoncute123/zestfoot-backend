import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { AiService } from './ai.service';

export class ChatDto {
  @ApiProperty({ description: 'Tin nhắn gửi đến AI', example: 'Tư vấn cho tôi giày chạy bộ nam' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Siêu dữ liệu phiên trò chuyện' })
  @IsOptional()
  @IsArray()
  session_metadata?: any[];

  @ApiPropertyOptional({ description: 'Ảnh người dùng dạng Base64' })
  @IsOptional()
  @IsString()
  user_image_base64?: string;

  @ApiPropertyOptional({ description: 'Ảnh đôi giày dạng Base64' })
  @IsOptional()
  @IsString()
  shoe_image_base64?: string;
}

export class ChatRagDto {
  @ApiProperty({ description: 'Câu hỏi của khách hàng', example: 'Đơn hàng của tôi giao đến đâu rồi?' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Ngữ cảnh người dùng (userId, email, tên)' })
  @IsOptional()
  userContext?: any;
}

export class ParseVoiceDto {
  @ApiProperty({ description: 'Nội dung khẩu lệnh giọng nói thô', example: 'vào giỏ hàng' })
  @IsString()
  @IsNotEmpty()
  text: string;
}

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Trò chuyện với trợ lý AI' })
  @ApiResponse({ status: 200, description: 'Phản hồi từ AI.' })
  async chat(@Body() body: ChatDto) {
    return this.aiService.chat(
      body.message,
      body.session_metadata,
      body.user_image_base64,
      body.shoe_image_base64,
    );
  }

  @Post('chat-rag')
  @ApiOperation({ summary: 'Tư vấn thông minh Agentic RAG' })
  @ApiResponse({ status: 200, description: 'Phản hồi từ trợ lý ảo.' })
  async chatRag(@Body() body: ChatRagDto) {
    return this.aiService.chatRag(body.message, body.userContext);
  }

  @Post('parse-voice')
  @ApiOperation({ summary: 'Phân tích khẩu lệnh giọng nói' })
  @ApiResponse({ status: 200, description: 'Ý định và các trường phân tích được.' })
  async parseVoice(@Body() body: ParseVoiceDto) {
    return this.aiService.parseVoice(body.text);
  }

  @Get('generate-embeddings')
  @ApiOperation({ summary: 'Tạo Vector Embeddings cho tất cả sản phẩm' })
  @ApiResponse({ status: 200, description: 'Kết quả tạo vector.' })
  async generateEmbeddings() {
    return this.aiService.generateEmbeddings();
  }
}
