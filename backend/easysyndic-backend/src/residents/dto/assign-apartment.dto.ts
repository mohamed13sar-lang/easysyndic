import { ResidentType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class AssignApartmentDto {
  @ApiProperty({ example: 'apartment-id' })
  @IsString()
  apartmentId!: string;

  @ApiProperty({ enum: ResidentType, example: ResidentType.TENANT })
  @IsEnum(ResidentType)
  residentType!: ResidentType;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: '2026-05-25' })
  @IsOptional()
  @IsDateString()
  startDate?: string;
}
