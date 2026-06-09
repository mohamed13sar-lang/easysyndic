import { ComplaintMediaType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddComplaintMediaDto {
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
