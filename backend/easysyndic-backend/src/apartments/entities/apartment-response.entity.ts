import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApartmentResponseEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  residenceId!: string;

  @ApiProperty()
  number!: string;

  @ApiPropertyOptional({ nullable: true, type: Number })
  floor!: number | null;

  @ApiPropertyOptional({ nullable: true })
  block!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  surface!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  monthlyFee!: number | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
