import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyndicResidenceSummaryEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty()
  city!: string;

  @ApiPropertyOptional({ nullable: true })
  district!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  totalApartments!: number | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  apartmentsCount!: number;

  @ApiProperty()
  residentsCount!: number;

  @ApiProperty()
  openComplaintsCount!: number;

  @ApiProperty()
  unpaidPaymentsAmount!: number;
}
