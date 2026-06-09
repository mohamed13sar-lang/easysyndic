import {
  ComplaintCategory,
  ComplaintMediaType,
  ComplaintUrgency,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateComplaintMediaItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ enum: ComplaintMediaType })
  @IsOptional()
  @IsEnum(ComplaintMediaType)
  fileType?: ComplaintMediaType;

  @ApiPropertyOptional({ enum: ComplaintMediaType })
  @IsOptional()
  @IsEnum(ComplaintMediaType)
  type?: ComplaintMediaType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;
}

export class CreateComplaintDto {
  @ApiProperty()
  @IsString()
  apartmentId!: string;

  @ApiProperty({ enum: ComplaintCategory })
  @IsEnum(ComplaintCategory)
  category!: ComplaintCategory;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  description!: string;

  @ApiPropertyOptional({ enum: ComplaintUrgency })
  @IsOptional()
  @IsEnum(ComplaintUrgency)
  urgency?: ComplaintUrgency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ type: [CreateComplaintMediaItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateComplaintMediaItemDto)
  media?: CreateComplaintMediaItemDto[];
}
