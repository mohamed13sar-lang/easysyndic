import { AnnouncementPriority, AnnouncementType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateAnnouncementDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  message!: string;

  @ApiProperty({ enum: AnnouncementType })
  @IsEnum(AnnouncementType)
  type!: AnnouncementType;

  @ApiPropertyOptional({ enum: AnnouncementPriority })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  publishAt?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
