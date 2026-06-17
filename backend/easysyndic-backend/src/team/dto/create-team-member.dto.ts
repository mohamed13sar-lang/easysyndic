import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import type { PermissionMap } from '../permissions.types';

export class CreateTeamMemberDto {
  @IsUUID()
  residenceId!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsObject()
  @IsOptional()
  permissions?: PermissionMap;

  @IsString()
  @MinLength(6)
  @IsOptional()
  temporaryPassword?: string;
}
