import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@easysyndic.com' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  identifier!: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
