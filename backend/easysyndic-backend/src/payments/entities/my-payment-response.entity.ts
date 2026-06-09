import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export class MyPaymentResponseEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  residenceId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  apartmentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  residentId?: string;

  @ApiProperty()
  month!: number;

  @ApiProperty()
  year!: number;

  @ApiProperty()
  amountDue!: number;

  @ApiProperty()
  amountPaid!: number;

  @ApiProperty()
  remainingAmount!: number;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiPropertyOptional({ nullable: true })
  dueDate!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  paidAt!: Date | null;

  @ApiPropertyOptional({ enum: PaymentMethod, nullable: true })
  paymentMethod!: PaymentMethod | null;

  @ApiPropertyOptional({ nullable: true })
  receiptUrl!: string | null;

  @ApiPropertyOptional()
  createdAt?: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;

  @ApiPropertyOptional({
    type: Object,
    nullable: true,
    example: { id: 'uuid', name: 'Résidence Test EasySyndic' },
  })
  residence?: { id: string; name: string };

  @ApiPropertyOptional({
    type: Object,
    nullable: true,
    example: { id: 'uuid', number: 'A-101', block: 'A', floor: 1 },
  })
  apartment?: {
    id: string;
    number: string;
    block: string | null;
    floor: number | null;
  };
}
