import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePostDto {
  @ApiPropertyOptional({ description: 'ID người dùng (UUID)', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsString()
  @IsOptional()
  user_id?: string;

  @ApiPropertyOptional({ description: 'Caption bài đăng', example: 'Thử thách 3 tấm ảnh cùng ZestFoot Photobooth!' })
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiProperty({ description: 'Đường dẫn hoặc dữ liệu base64 của ảnh', example: 'data:image/jpeg;base64,...' })
  @IsString()
  @IsNotEmpty({ message: 'Hình ảnh không được để trống' })
  image: string;
}
