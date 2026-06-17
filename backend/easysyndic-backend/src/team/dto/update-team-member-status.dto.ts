import { IsBoolean } from 'class-validator';

export class UpdateTeamMemberStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
