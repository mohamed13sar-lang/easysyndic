import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AgendaItemDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}
