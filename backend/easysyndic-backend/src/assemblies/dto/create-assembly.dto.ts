import { AssemblyType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateAssemblyDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AssemblyType)
  type?: AssemblyType;

  @IsDateString()
  scheduledAt!: string;

  @IsString()
  location!: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quorumRequired?: number;
}
