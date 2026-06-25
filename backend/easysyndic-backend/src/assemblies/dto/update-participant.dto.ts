import { ParticipantStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateParticipantDto {
  @IsEnum(ParticipantStatus)
  status!: ParticipantStatus;

  @IsOptional()
  @IsString()
  representedByName?: string;
}
