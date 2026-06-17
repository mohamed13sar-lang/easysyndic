import { UserRole } from '@prisma/client';
import { IsEnum, IsObject, IsOptional } from 'class-validator';
import type { PermissionMap } from '../permissions.types';

export class UpdateTeamMemberDto {
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsObject()
  @IsOptional()
  permissions?: PermissionMap;
}
