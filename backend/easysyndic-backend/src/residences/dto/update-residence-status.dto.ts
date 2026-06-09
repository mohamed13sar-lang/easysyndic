import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateResidenceStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive!: boolean;
}
