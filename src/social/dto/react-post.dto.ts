import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ReactPostDto {
  @ApiProperty({ description: 'ID người dùng (UUID)', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsString()
  @IsNotEmpty({ message: 'User ID không được để trống' })
  user_id: string;

  @ApiProperty({ description: 'Loại cảm xúc (hype, sneaker, cop...)', example: 'hype' })
  @IsString()
  @IsNotEmpty({ message: 'Loại phản ứng không được để trống' })
  reaction_type: string;
}
