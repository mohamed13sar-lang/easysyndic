import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateResidenceDto {
  @ApiProperty({ example: 'Palm View Residence' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: '12 Avenue Hassan II' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  address!: string;

  @ApiProperty({ example: 'Casablanca' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  city!: string;

  @ApiPropertyOptional({ example: 'Maarif' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @ApiPropertyOptional({
    description: 'Required for SUPER_ADMIN. Ignored for SYNDIC users.',
  })
  @IsOptional()
  @IsString()
  syndicId?: string;

  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalApartments?: number;
}
