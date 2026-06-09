import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateAnnouncementStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}
