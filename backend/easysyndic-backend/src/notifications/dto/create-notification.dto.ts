import {
  NotificationTargetType,
  NotificationType,
  UserRole,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  message!: string;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiProperty({ enum: NotificationTargetType })
  @IsEnum(NotificationTargetType)
  targetType!: NotificationTargetType;

  @ApiPropertyOptional({
    description: 'userId, apartmentId, role name, or contextual target id',
  })
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export const RoleValues = Object.values(UserRole);
