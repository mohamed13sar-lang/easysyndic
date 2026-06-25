import { AssemblyVoteValue } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class VoteResolutionDto {
  @IsEnum(AssemblyVoteValue)
  vote!: AssemblyVoteValue;
}
