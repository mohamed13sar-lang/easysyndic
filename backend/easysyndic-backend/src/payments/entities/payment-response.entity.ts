import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentResponseEntity {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  residenceId!: string;
  @ApiProperty()
  apartmentId!: string;
  @ApiProperty()
  residentId!: string;
  @ApiProperty()
  amountDue!: number;
  @ApiProperty()
  amountPaid!: number;
  @ApiProperty()
  remainingAmount!: number;
  @ApiProperty()
  month!: number;
  @ApiProperty()
  year!: number;
  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;
  @ApiPropertyOptional({ enum: PaymentMethod, nullable: true })
  paymentMethod!: PaymentMethod | null;
  @ApiPropertyOptional({ nullable: true })
  receiptUrl!: string | null;
  @ApiPropertyOptional({ nullable: true })
  note!: string | null;
  @ApiPropertyOptional({ nullable: true })
  paidAt!: Date | null;
  @ApiProperty()
  isActive!: boolean;
  @ApiProperty()
  createdById!: string;
  @ApiProperty()
  createdAt!: Date;
  @ApiProperty()
  updatedAt!: Date;
}
