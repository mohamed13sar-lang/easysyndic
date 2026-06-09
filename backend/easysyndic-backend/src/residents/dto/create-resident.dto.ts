import { ResidentType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateResidentDto {
  @ApiProperty({ example: 'Resident Name' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: '+212600000300' })
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'phone must be a valid international phone number',
  })
  phone!: string;

  @ApiPropertyOptional({ example: 'resident@easysyndic.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password?: string;

  @ApiProperty({ example: 'apartment-id' })
  @IsString()
  apartmentId!: string;

  @ApiProperty({ enum: ResidentType, example: ResidentType.OWNER })
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
