import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequirePermission } from '../team/decorators/require-permission.decorator';
import { PermissionsGuard } from '../team/guards/permissions.guard';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { SendPaymentReminderDto } from './dto/send-payment-reminder.dto';
import { NotificationRecipientResponseEntity } from './entities/notification-recipient-response.entity';
import { NotificationResponseEntity } from './entities/notification-response.entity';
import { NotificationsService } from './notifications.service';

type AuthUser = { id: string; role: UserRole };

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('residences/:residenceId/notifications')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC, UserRole.VICE_SYNDIC, UserRole.SECRETAIRE)
  @RequirePermission('notifications', 'send')
  @ApiOperation({ summary: 'Create notification for a residence target scope' })
  @ApiCreatedResponse({ type: NotificationResponseEntity })
  create(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Body() dto: CreateNotificationDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.notificationsService.createForResidence(
      residenceId,
      dto,
      currentUser,
    );
  }

  @Get('residences/:residenceId/notifications')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC, UserRole.VICE_SYNDIC, UserRole.SECRETAIRE)
  @RequirePermission('notifications', 'view')
  @ApiOperation({ summary: 'List notifications by residence' })
  @ApiOkResponse({ type: NotificationResponseEntity, isArray: true })
  findByResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.notificationsService.findByResidence(residenceId, currentUser);
  }

  @Post('residences/:residenceId/notifications/non-paid')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC, UserRole.VICE_SYNDIC, UserRole.CAISSIER, UserRole.CASHIER)
  @RequirePermission('notifications', 'send')
  @ApiOperation({ summary: 'Send non-paid payment reminders' })
  @ApiCreatedResponse({ type: NotificationResponseEntity })
  sendNonPaid(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Body() dto: SendPaymentReminderDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.notificationsService.sendNonPaidReminder(
      residenceId,
      dto,
      currentUser,
    );
  }

  @Get('notifications/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Get notification by id' })
  @ApiOkResponse({ type: NotificationResponseEntity })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.notificationsService.findOne(id, currentUser);
  }

  @Get('me/notifications')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'List current user notifications' })
  @ApiOkResponse({ type: NotificationRecipientResponseEntity, isArray: true })
  findMine(
    @CurrentUser() currentUser: AuthUser,
    @Query('residenceId') residenceId?: string,
    @Query('isRead') isRead?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.notificationsService.findMyNotifications(currentUser, {
      residenceId,
      isRead,
      type,
      limit,
      page,
    });
  }

  @Get('me/notifications/:recipientId')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'Get current user notification by recipient id' })
  @ApiOkResponse({ type: NotificationRecipientResponseEntity })
  findMineOne(
    @Param('recipientId', new ParseUUIDPipe()) recipientId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.notificationsService.findMyNotification(
      recipientId,
      currentUser,
    );
  }

  @Patch('me/notifications/:recipientId/read')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'Mark one notification as read' })
  markRead(
    @Param('recipientId', new ParseUUIDPipe()) recipientId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.notificationsService.markOneRead(recipientId, currentUser);
  }

  @Patch('me/notifications/read-all')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  markAllRead(
    @CurrentUser() currentUser: AuthUser,
    @Query('residenceId') residenceId?: string,
  ) {
    return this.notificationsService.markAllRead(currentUser, residenceId);
  }

  @Post('me/push-token')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.CAISSIER,
    UserRole.CASHIER,
    UserRole.GARDIEN,
    UserRole.SECRETAIRE,
    UserRole.RESIDENT,
  )
  @ApiOperation({ summary: 'Register Expo push token for current user' })
  registerPushToken(
    @Body() dto: RegisterPushTokenDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.notificationsService.registerPushToken(dto, currentUser);
  }
}
