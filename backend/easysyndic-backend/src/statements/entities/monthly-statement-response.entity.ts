import { MonthlyStatementStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MonthlyStatementResponseEntity {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  residenceId!: string;
  @ApiProperty()
  month!: number;
  @ApiProperty()
  year!: number;
  @ApiProperty()
  openingBalance!: number;
  @ApiProperty()
  totalIncome!: number;
  @ApiProperty()
  totalExpenses!: number;
  @ApiProperty()
  closingBalance!: number;
  @ApiProperty()
  generatedById!: string;
  @ApiPropertyOptional({ nullable: true })
  pdfUrl!: string | null;
  @ApiProperty({ enum: MonthlyStatementStatus })
  status!: MonthlyStatementStatus;
  @ApiProperty()
  createdAt!: Date;
  @ApiProperty()
  updatedAt!: Date;
}
