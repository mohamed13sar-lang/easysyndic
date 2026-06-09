import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateApartmentDto {
  @ApiProperty({ example: 'A-101' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  number!: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  floor?: number;

  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  block?: string;

  @ApiPropertyOptional({ example: 85.5 })
  @IsOptional()
  @IsNumber()
  surface?: number;

  @ApiPropertyOptional({ example: 450 })
  @IsOptional()
  @IsNumber()
  monthlyFee?: number;
}
