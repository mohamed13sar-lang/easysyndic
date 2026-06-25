import { ParticipantStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateAttendanceDto {
  @IsEnum(ParticipantStatus)
  status!: ParticipantStatus;

  @IsOptional()
  @IsString()
  representedByName?: string;
}
