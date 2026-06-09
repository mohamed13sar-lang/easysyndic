import {
  NotificationStatus,
  NotificationTargetType,
  NotificationType,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationRecipientResponseEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  recipientId!: string;

  @ApiProperty()
  notificationId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty({ enum: NotificationTargetType })
  targetType!: NotificationTargetType;

  @ApiPropertyOptional({ type: Object, nullable: true })
  metadata!: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true })
  senderName!: string | null;

  @ApiProperty()
  isRead!: boolean;

  @ApiPropertyOptional({ nullable: true })
  readAt!: Date | null;

  @ApiProperty({ enum: NotificationStatus })
  pushStatus!: NotificationStatus;

  @ApiProperty()
  createdAt!: Date;
}
