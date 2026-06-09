import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResidentType, UserRole } from '@prisma/client';

class MeUserEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  phone!: string;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty()
  isActive!: boolean;
}

class MeApartmentEntity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

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
}

class MeResidenceLinkEntity {
  @ApiProperty({ format: 'uuid' })
  relationId!: string;

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

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ enum: ResidentType })
  residentType!: ResidentType;

  @ApiProperty()
  isPrimary!: boolean;

  @ApiProperty()
  relationIsActive!: boolean;

  @ApiPropertyOptional({ nullable: true })
  startDate!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  endDate!: Date | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  monthlyFee!: number | null;

  @ApiProperty({ type: MeApartmentEntity })
  apartment!: MeApartmentEntity;
}

export class MeResidencesResponseEntity {
  @ApiProperty({ type: MeUserEntity })
  user!: MeUserEntity;

  @ApiProperty({ type: MeResidenceLinkEntity, isArray: true })
  residences!: MeResidenceLinkEntity[];

  @ApiPropertyOptional({ type: MeResidenceLinkEntity, nullable: true })
  activeRelation!: MeResidenceLinkEntity | null;
}
