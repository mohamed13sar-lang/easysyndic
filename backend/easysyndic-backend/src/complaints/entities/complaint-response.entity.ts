import {
  ComplaintCategory,
  ComplaintStatus,
  ComplaintUrgency,
  UserRole,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComplaintMediaResponseEntity } from './complaint-media-response.entity';

class ComplaintResidentInfo {
  @ApiProperty()
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

class ComplaintApartmentInfo {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  number!: string;
  @ApiPropertyOptional({ nullable: true })
  block!: string | null;
  @ApiPropertyOptional({ nullable: true, type: Number })
  floor!: number | null;
}

export class ComplaintResponseEntity {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  residenceId!: string;
  @ApiProperty()
  apartmentId!: string;
  @ApiPropertyOptional({ nullable: true })
  residentId!: string | null;
  @ApiPropertyOptional({ type: ComplaintResidentInfo, nullable: true })
  resident!: ComplaintResidentInfo | null;
  @ApiProperty({ type: ComplaintApartmentInfo })
  apartment!: ComplaintApartmentInfo;
  @ApiProperty({ enum: ComplaintCategory })
  category!: ComplaintCategory;
  @ApiProperty()
  title!: string;
  @ApiProperty()
  description!: string;
  @ApiProperty({ enum: ComplaintUrgency })
  urgency!: ComplaintUrgency;
  @ApiProperty({ enum: ComplaintStatus })
  status!: ComplaintStatus;
  @ApiPropertyOptional({ nullable: true })
  assignedToId!: string | null;
  @ApiProperty()
  sentToLhrayfi!: boolean;
  @ApiProperty()
  isAnonymous!: boolean;
  @ApiProperty()
  isActive!: boolean;
  @ApiProperty()
  createdAt!: Date;
  @ApiProperty()
  updatedAt!: Date;
  @ApiPropertyOptional({ nullable: true })
  closedAt!: Date | null;
  @ApiProperty({ type: ComplaintMediaResponseEntity, isArray: true })
  media!: ComplaintMediaResponseEntity[];
  @ApiProperty()
  commentsCount!: number;
}
