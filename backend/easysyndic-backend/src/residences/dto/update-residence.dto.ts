import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateResidenceDto {
  @ApiPropertyOptional({ example: 'Palm View Residence' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: '12 Avenue Hassan II' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: 'Casablanca' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ example: 'Maarif' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalApartments?: number;
}
