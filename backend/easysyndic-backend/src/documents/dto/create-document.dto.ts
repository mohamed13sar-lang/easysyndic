import { DocumentType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateDocumentDto {
  @IsUUID()
  residenceId!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(DocumentType)
  type!: DocumentType;
}
