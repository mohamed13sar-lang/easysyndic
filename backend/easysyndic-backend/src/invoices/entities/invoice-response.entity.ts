import { InvoiceStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvoiceResponseEntity {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  residenceId!: string;
  @ApiProperty()
  title!: string;
  @ApiPropertyOptional({ nullable: true })
  supplierName!: string | null;
  @ApiProperty()
  category!: string;
  @ApiProperty()
  amount!: number;
  @ApiProperty()
  invoiceDate!: Date;
  @ApiPropertyOptional({ nullable: true })
  paymentDate!: Date | null;
  @ApiProperty({ enum: InvoiceStatus })
  status!: InvoiceStatus;
  @ApiPropertyOptional({ nullable: true })
  fileUrl!: string | null;
  @ApiPropertyOptional({ nullable: true })
  note!: string | null;
  @ApiProperty()
  createdById!: string;
  @ApiProperty()
  isActive!: boolean;
  @ApiProperty()
  createdAt!: Date;
  @ApiProperty()
  updatedAt!: Date;
}
