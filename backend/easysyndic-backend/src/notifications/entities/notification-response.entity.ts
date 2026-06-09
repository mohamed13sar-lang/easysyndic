import { NotificationTargetType, NotificationType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseEntity {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  residenceId!: string | null;

  @ApiProperty()
  senderId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty({ enum: NotificationTargetType })
  targetType!: NotificationTargetType;

  @ApiPropertyOptional({ nullable: true })
  targetId!: string | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  metadata!: Record<string, unknown> | null;

  @ApiProperty()
  recipientsCount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
