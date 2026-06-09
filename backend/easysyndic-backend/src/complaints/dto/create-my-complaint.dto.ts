import { ApiProperty } from '@nestjs/swagger';
import { ComplaintCategory, ComplaintUrgency } from '@prisma/client';
import { IsEnum, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateMyComplaintDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  residenceId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
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

  @ApiProperty({ enum: ComplaintUrgency })
  @IsEnum(ComplaintUrgency)
  urgency!: ComplaintUrgency;
}
