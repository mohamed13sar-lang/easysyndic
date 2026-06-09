import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResidenceResponseEntity {
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

  @ApiProperty({ format: 'uuid' })
  syndicId!: string;

  @ApiPropertyOptional({ nullable: true, type: Number })
  totalApartments!: number | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
