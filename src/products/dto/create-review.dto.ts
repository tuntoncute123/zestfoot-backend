import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEmail, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: 'ID sản phẩm đánh giá', example: '1' })
  @IsString()
  @IsNotEmpty({ message: 'ID sản phẩm không được để trống' })
  product_id: string;

  @ApiProperty({ description: 'Số sao đánh giá (1-5)', example: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsNotEmpty({ message: 'Điểm đánh giá không được để trống' })
  rating: number;

  @ApiProperty({ description: 'Tiêu đề đánh giá', example: 'Giày đi rất êm và ôm chân' })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title: string;

  @ApiProperty({ description: 'Nội dung chi tiết đánh giá', example: 'Tôi đã mua sản phẩm này và đi rất thoải mái, chất lượng tuyệt vời.' })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung đánh giá không được để trống' })
  content: string;

  @ApiProperty({ description: 'Tên người hiển thị đánh giá', example: 'Trần Văn B' })
  @IsString()
  @IsNotEmpty({ message: 'Tên hiển thị không được để trống' })
  display_name: string;

  @ApiPropertyOptional({ description: 'Email của người đánh giá', example: 'customer@example.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Đường dẫn ảnh đại diện', example: 'https://images.example.com/avatar.jpg' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({ description: 'Nhãn phân tích cảm xúc', example: 'positive' })
  @IsString()
  @IsOptional()
  sentiment?: string;

  @ApiPropertyOptional({ description: 'Điểm số cảm xúc (0-1)', example: 0.95 })
  @IsNumber()
  @IsOptional()
  sentiment_score?: number;

  @ApiPropertyOptional({ description: 'Giải thích về cảm xúc', example: 'Lời đánh giá thể hiện sự hài lòng cao.' })
  @IsString()
  @IsOptional()
  sentiment_explanation?: string;
}
