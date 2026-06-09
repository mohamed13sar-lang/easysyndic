import { ApiProperty } from '@nestjs/swagger';

export class SyndicDashboardStatsEntity {
  @ApiProperty()
  totalResidences!: number;

  @ApiProperty()
  totalApartments!: number;

  @ApiProperty()
  totalResidents!: number;

  @ApiProperty()
  unpaidPaymentsCount!: number;

  @ApiProperty()
  unpaidPaymentsAmount!: number;

  @ApiProperty()
  openComplaintsCount!: number;

  @ApiProperty()
  resolvedComplaintsCount!: number;

  @ApiProperty()
  notificationsSentCount!: number;
}
