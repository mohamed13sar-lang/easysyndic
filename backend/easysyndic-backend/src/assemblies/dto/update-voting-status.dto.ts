import { ResolutionVotingStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateVotingStatusDto {
  @IsEnum(ResolutionVotingStatus)
  votingStatus!: ResolutionVotingStatus;
}
