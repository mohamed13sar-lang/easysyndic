import { AnnouncementPriority, AnnouncementType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnnouncementResponseEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  residenceId!: string;

  @ApiProperty()
  createdById!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty({ enum: AnnouncementType })
  type!: AnnouncementType;

  @ApiProperty({ enum: AnnouncementPriority })
  priority!: AnnouncementPriority;

  @ApiProperty()
  publishAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  expiresAt!: Date | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  residence?: { id: string; name: string };

  @ApiPropertyOptional()
  createdBy?: { id: string; fullName: string };
}
