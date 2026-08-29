import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CommentPostDto {
  @ApiProperty({ description: 'ID người dùng (UUID)', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsString()
  @IsNotEmpty({ message: 'User ID không được để trống' })
  user_id: string;

  @ApiProperty({ description: 'Nội dung bình luận', example: 'Đẹp quá bạn ơi!' })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung bình luận không được để trống' })
  content: string;
}
