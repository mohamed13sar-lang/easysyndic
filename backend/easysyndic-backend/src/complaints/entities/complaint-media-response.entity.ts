import { ComplaintMediaType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ComplaintMediaResponseEntity {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  complaintId!: string;
  @ApiProperty()
  fileUrl!: string;
  @ApiProperty()
  url!: string;
  @ApiProperty({ enum: ComplaintMediaType })
  fileType!: ComplaintMediaType;
  @ApiProperty({ enum: ComplaintMediaType })
  type!: ComplaintMediaType;
  @ApiPropertyOptional({ nullable: true })
  fileName!: string | null;
  @ApiPropertyOptional({ nullable: true })
  mimeType!: string | null;
  @ApiPropertyOptional({ nullable: true })
  size!: number | null;
  @ApiPropertyOptional({ nullable: true })
  uploadedById!: string | null;
  @ApiProperty()
  createdAt!: Date;
}
