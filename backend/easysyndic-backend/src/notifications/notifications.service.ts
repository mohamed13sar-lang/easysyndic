import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ComplaintStatus,
  NotificationStatus,
  NotificationTargetType,
  NotificationType,
  PaymentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateNotificationDto,
  RoleValues,
} from './dto/create-notification.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { SendPaymentReminderDto } from './dto/send-payment-reminder.dto';

type AuthUser = {
  id: string;
  role: UserRole;
  permissionChecked?: { residenceId: string };
};
type PaymentNotificationEvent =
  | 'PENDING_VALIDATION'
  | 'VALIDATED'
  | 'REJECTED'
  | 'STATUS_CHANGED';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createForResidence(
    residenceId: string,
    dto: CreateNotificationDto,
    currentUser: AuthUser,
  ) {
    await this.validateResidenceAccess(currentUser, residenceId, true);
    const recipientIds = await this.resolveRecipients(
      residenceId,
      dto,
      currentUser,
    );
    return this.createNotificationWithRecipients(
      {
        residenceId,
        senderId: currentUser.id,
        title: dto.title,
        message: dto.message,
        type: dto.type ?? NotificationType.GENERAL,
        targetType: dto.targetType,
        targetId: dto.targetId,
        metadata: dto.metadata,
      },
      recipientIds,
    );
  }

  async findByResidence(residenceId: string, currentUser: AuthUser) {
    await this.validateResidenceAccess(currentUser, residenceId, true);
    const items = await this.prisma.notification.findMany({
      where: { residenceId },
      include: { _count: { select: { recipients: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((n) => this.toNotificationResponse(n));
  }

  async sendNonPaidReminder(
    residenceId: string,
    dto: SendPaymentReminderDto,
    currentUser: AuthUser,
  ) {
    await this.validateResidenceAccess(currentUser, residenceId, false);
    const payments = await this.prisma.payment.findMany({
      where: {
        residenceId,
        month: dto.month,
        year: dto.year,
        isActive: true,
        status: {
          in: [
            PaymentStatus.NON_PAYE,
            PaymentStatus.EN_RETARD,
            PaymentStatus.PARTIELLEMENT_PAYE,
          ],
        },
      },
      select: { residentId: true },
    });

    const recipientIds = [...new Set(payments.map((p) => p.residentId))];
    if (recipientIds.length === 0) {
      return {
        recipientsCount: 0,
        message: 'No unpaid residents for this period',
      };
    }

    return this.createNotificationWithRecipients(
      {
        residenceId,
        senderId: currentUser.id,
        title: dto.title ?? 'Rappel de paiement',
        message:
          dto.message ??
          'Votre cotisation n’a pas encore été réglée. Merci de régulariser votre situation.',
        type: NotificationType.PAYMENT_REMINDER,
        targetType: NotificationTargetType.NON_PAID,
        targetId: `${dto.month}-${dto.year}`,
        metadata: { month: dto.month, year: dto.year },
      },
      recipientIds,
    );
  }

  async findOne(id: string, currentUser: AuthUser) {
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.role !== UserRole.SYNDIC
    ) {
      throw new ForbiddenException('Forbidden');
    }
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: {
        residence: { select: { syndicId: true } },
        _count: { select: { recipients: true } },
      },
    });
    if (!notification)
      throw new NotFoundException(`Notification with id "${id}" not found`);
    if (
      currentUser.role === UserRole.SYNDIC &&
      notification.residence &&
      notification.residence.syndicId !== currentUser.id
    ) {
      throw new ForbiddenException('Forbidden');
    }
    return this.toNotificationResponse(notification);
  }

  async findMyNotifications(
    currentUser: AuthUser,
    query: {
      residenceId?: string;
      isRead?: string;
      type?: string;
      limit?: string;
      page?: string;
    },
  ) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }

    if (query.residenceId) {
      await this.ensureResidentResidenceAccess(
        currentUser.id,
        query.residenceId,
      );
    }

    const limit = Math.max(1, Math.min(Number(query.limit ?? 20), 100));
    const page = Math.max(1, Number(query.page ?? 1));
    const isReadFilter =
      query.isRead === undefined ? undefined : query.isRead === 'true';
    const typeFilter = query.type as NotificationType | undefined;

    const rows = await this.prisma.notificationRecipient.findMany({
      where: {
        userId: currentUser.id,
        ...(isReadFilter === undefined ? {} : { isRead: isReadFilter }),
        ...(typeFilter || query.residenceId
          ? {
              notification: {
                ...(typeFilter ? { type: typeFilter } : {}),
                ...(query.residenceId
                  ? { residenceId: query.residenceId }
                  : {}),
              },
            }
          : {}),
      },
      include: {
        notification: {
          include: { sender: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return rows.map((r) => this.toMyNotificationRecipientResponse(r));
  }

  async findMyNotification(recipientId: string, currentUser: AuthUser) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }

    const row = await this.prisma.notificationRecipient.findUnique({
      where: { id: recipientId },
      include: {
        notification: {
          include: { sender: { select: { fullName: true } } },
        },
      },
    });

    if (!row || row.userId !== currentUser.id) {
      throw new NotFoundException('Notification recipient not found');
    }

    return this.toMyNotificationRecipientResponse(row);
  }

  async markOneRead(recipientId: string, currentUser: AuthUser) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }

    const row = await this.prisma.notificationRecipient.findUnique({
      where: { id: recipientId },
    });
    if (!row || row.userId !== currentUser.id)
      throw new NotFoundException('Notification recipient not found');
    return this.prisma.notificationRecipient.update({
      where: { id: recipientId },
      data: {
        isRead: true,
        readAt: new Date(),
        pushStatus: NotificationStatus.READ,
      },
    });
  }

  async markAllRead(currentUser: AuthUser, residenceId?: string) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }

    if (residenceId) {
      await this.ensureResidentResidenceAccess(currentUser.id, residenceId);
    }

    const now = new Date();
    const result = await this.prisma.notificationRecipient.updateMany({
      where: {
        userId: currentUser.id,
        isRead: false,
        ...(residenceId ? { notification: { residenceId } } : {}),
      },
      data: { isRead: true, readAt: now, pushStatus: NotificationStatus.READ },
    });
    return { updatedCount: result.count };
  }

  async registerPushToken(dto: RegisterPushTokenDto, currentUser: AuthUser) {
    return this.prisma.userPushToken.upsert({
      where: { expoPushToken: dto.expoPushToken },
      update: {
        userId: currentUser.id,
        platform: dto.platform,
        isActive: true,
      },
      create: {
        userId: currentUser.id,
        expoPushToken: dto.expoPushToken,
        platform: dto.platform,
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
        expoPushToken: true,
        platform: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async sendAnnouncementNotification(announcementId: string, senderId: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
      select: {
        id: true,
        residenceId: true,
        title: true,
        isActive: true,
      },
    });
    if (!announcement || !announcement.isActive) {
      throw new NotFoundException(
        `Announcement with id "${announcementId}" not found`,
      );
    }

    return this.createNotificationWithRecipients(
      {
        residenceId: announcement.residenceId,
        senderId,
        title: 'Nouvelle annonce',
        message: announcement.title,
        type: NotificationType.NEW_ANNOUNCEMENT,
        targetType: NotificationTargetType.RESIDENCE,
        targetId: announcement.residenceId,
        metadata: { announcementId },
      },
      await this.getResidenceResidentUserIds(announcement.residenceId),
    );
  }

  async sendComplaintStatusNotification(
    complaintId: string,
    newStatus: ComplaintStatus,
    senderId: string,
  ) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
    });
    if (!complaint)
      throw new NotFoundException(
        `Complaint with id "${complaintId}" not found`,
      );
    return this.createNotificationWithRecipients(
      {
        residenceId: complaint.residenceId,
        senderId,
        title: 'Mise à jour de votre réclamation',
        message: 'Le statut de votre réclamation a été mis à jour.',
        type: NotificationType.COMPLAINT_STATUS,
        targetType: NotificationTargetType.USER,
        targetId: complaint.residentId,
        metadata: { complaintId, newStatus },
      },
      [complaint.residentId],
    );
  }

  async sendPaymentReceivedNotification(paymentId: string, senderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment)
      throw new NotFoundException(`Payment with id "${paymentId}" not found`);
    return this.createNotificationWithRecipients(
      {
        residenceId: payment.residenceId,
        senderId,
        title: 'Paiement reçu',
        message: 'Votre paiement a été enregistré avec succès.',
        type: NotificationType.PAYMENT_RECEIVED,
        targetType: NotificationTargetType.USER,
        targetId: payment.residentId,
        metadata: {
          paymentId,
          month: payment.month,
          year: payment.year,
          amountPaid: payment.amountPaid,
        },
      },
      [payment.residentId],
    );
  }

  async sendPaymentStatusNotification(
    paymentId: string,
    senderId: string,
    event: PaymentNotificationEvent,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment)
      throw new NotFoundException(`Payment with id "${paymentId}" not found`);

    const copy = this.getPaymentNotificationCopy(event, payment.status);
    return this.createNotificationWithRecipients(
      {
        residenceId: payment.residenceId,
        senderId,
        title: copy.title,
        message: copy.message,
        type: NotificationType.PAYMENT_RECEIVED,
        targetType: NotificationTargetType.USER,
        targetId: payment.residentId,
        metadata: {
          paymentId,
          event,
          status: payment.status,
          month: payment.month,
          year: payment.year,
          amountPaid: payment.amountPaid,
        },
      },
      [payment.residentId],
    );
  }

  private getPaymentNotificationCopy(
    event: PaymentNotificationEvent,
    status: PaymentStatus,
  ) {
    if (event === 'PENDING_VALIDATION') {
      return {
        title: 'Paiement en attente de validation',
        message: 'Votre declaration de paiement a bien ete envoyee.',
      };
    }
    if (event === 'REJECTED') {
      return {
        title: 'Paiement refuse',
        message: 'Votre declaration de paiement a ete refusee.',
      };
    }
    if (event === 'VALIDATED') {
      return {
        title: 'Paiement valide',
        message: 'Votre paiement a ete valide avec succes.',
      };
    }
    return {
      title: 'Statut du paiement mis a jour',
      message: `Votre paiement est maintenant ${status}.`,
    };
  }

  private async resolveRecipients(
    residenceId: string,
    dto: CreateNotificationDto,
    currentUser: AuthUser,
  ) {
    if (dto.targetType === NotificationTargetType.RESIDENCE) {
      return this.getResidenceResidentUserIds(residenceId);
    }
    if (dto.targetType === NotificationTargetType.APARTMENT) {
      if (!dto.targetId)
        throw new ForbiddenException(
          'targetId is required for APARTMENT targetType',
        );
      const apartment = await this.prisma.apartment.findUnique({
        where: { id: dto.targetId },
        select: { id: true, residenceId: true },
      });
      if (!apartment || apartment.residenceId !== residenceId) {
        throw new NotFoundException('Apartment not found in residence');
      }
      return this.getApartmentResidentUserIds(apartment.id);
    }
    if (dto.targetType === NotificationTargetType.USER) {
      if (!dto.targetId)
        throw new ForbiddenException(
          'targetId is required for USER targetType',
        );
      const user = await this.prisma.user.findUnique({
        where: { id: dto.targetId },
        select: { id: true, isActive: true },
      });
      if (!user || !user.isActive)
        throw new NotFoundException('Target user not found');
      if (currentUser.role !== UserRole.SUPER_ADMIN) {
        const hasLink = await this.prisma.residentApartment.findFirst({
          where: { userId: user.id, residenceId, isActive: true },
          select: { id: true },
        });
        if (!hasLink)
          throw new ForbiddenException(
            'Target user is not linked to this residence',
          );
      }
      return [user.id];
    }
    if (dto.targetType === NotificationTargetType.ROLE) {
      if (!dto.targetId || !RoleValues.includes(dto.targetId as UserRole)) {
        throw new ForbiddenException(
          'targetId must be a valid role for ROLE targetType',
        );
      }
      const role = dto.targetId as UserRole;
      if (role === UserRole.RESIDENT) {
        return this.getResidenceResidentUserIds(residenceId);
      }
      const users = await this.prisma.user.findMany({
        where: { role, isActive: true },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }
    if (dto.targetType === NotificationTargetType.NON_PAID) {
      const meta = dto.metadata as
        | { month?: number; year?: number }
        | undefined;
      if (!meta?.month || !meta?.year) {
        throw new ForbiddenException(
          'metadata.month and metadata.year are required for NON_PAID targetType',
        );
      }
      const rows = await this.prisma.payment.findMany({
        where: {
          residenceId,
          month: meta.month,
          year: meta.year,
          isActive: true,
          status: {
            in: [
              PaymentStatus.NON_PAYE,
              PaymentStatus.PARTIELLEMENT_PAYE,
              PaymentStatus.EN_RETARD,
            ],
          },
        },
        select: { residentId: true },
      });
      return [...new Set(rows.map((r) => r.residentId))];
    }
    return [];
  }

  private async getResidenceResidentUserIds(residenceId: string) {
    const rows = await this.prisma.residentApartment.findMany({
      where: {
        residenceId,
        isActive: true,
        user: { isActive: true, role: UserRole.RESIDENT },
      },
      select: { userId: true },
    });
    return [...new Set(rows.map((r) => r.userId))];
  }

  private async getApartmentResidentUserIds(apartmentId: string) {
    const rows = await this.prisma.residentApartment.findMany({
      where: {
        apartmentId,
        isActive: true,
        user: { isActive: true, role: UserRole.RESIDENT },
      },
      select: { userId: true },
    });
    return [...new Set(rows.map((r) => r.userId))];
  }

  private async ensureResidentResidenceAccess(
    userId: string,
    residenceId: string,
  ) {
    const link = await this.prisma.residentApartment.findFirst({
      where: {
        userId,
        residenceId,
        isActive: true,
        user: { isActive: true, role: UserRole.RESIDENT },
      },
      select: { id: true },
    });

    if (!link) {
      throw new ForbiddenException('Resident is not linked to this residence');
    }
  }

  private async validateResidenceAccess(
    currentUser: AuthUser,
    residenceId: string,
    allowOnlyAdminSyndic = false,
  ) {
    const residence = await this.prisma.residence.findUnique({
      where: { id: residenceId },
      select: { id: true, syndicId: true },
    });
    if (!residence)
      throw new NotFoundException(
        `Residence with id "${residenceId}" not found`,
      );

    if (currentUser.role === UserRole.SUPER_ADMIN) return residence;
    if (
      currentUser.role === UserRole.SYNDIC &&
      residence.syndicId === currentUser.id
    )
      return residence;
    if (currentUser.permissionChecked?.residenceId === residenceId) {
      return residence;
    }
    if (!allowOnlyAdminSyndic && currentUser.role === UserRole.CASHIER) {
      // TODO: restrict CASHIER by residence assignment table once available.
      return residence;
    }
    throw new ForbiddenException('You can only access allowed residences');
  }

  private async createNotificationWithRecipients(
    data: {
      residenceId?: string | null;
      senderId: string;
      title: string;
      message: string;
      type: NotificationType;
      targetType: NotificationTargetType;
      targetId?: string | null;
      metadata?: Record<string, unknown>;
    },
    recipientIds: string[],
  ) {
    const uniqueRecipientIds = [...new Set(recipientIds)];
    const activeUsers = await this.prisma.user.findMany({
      where: { id: { in: uniqueRecipientIds }, isActive: true },
      select: { id: true },
    });
    const filtered = activeUsers.map((u) => u.id);

    const notification = await this.prisma.notification.create({
      data: {
        residenceId: data.residenceId ?? null,
        senderId: data.senderId,
        title: data.title,
        message: data.message,
        type: data.type,
        targetType: data.targetType,
        targetId: data.targetId ?? null,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    if (filtered.length > 0) {
      await this.prisma.notificationRecipient.createMany({
        data: filtered.map((userId) => ({
          notificationId: notification.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    // TODO: dispatch Expo push notifications to UserPushToken rows when Expo is configured.
    const withCount = await this.prisma.notification.findUniqueOrThrow({
      where: { id: notification.id },
      include: { _count: { select: { recipients: true } } },
    });
    return this.toNotificationResponse(withCount);
  }

  private toNotificationResponse(notification: {
    id: string;
    residenceId: string | null;
    senderId: string;
    title: string;
    message: string;
    type: NotificationType;
    targetType: NotificationTargetType;
    targetId: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
    _count: { recipients: number };
  }) {
    return {
      id: notification.id,
      residenceId: notification.residenceId,
      senderId: notification.senderId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      targetType: notification.targetType,
      targetId: notification.targetId,
      metadata: notification.metadata as Record<string, unknown> | null,
      recipientsCount: notification._count.recipients,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  private toMyNotificationRecipientResponse(row: {
    id: string;
    notificationId: string;
    isRead: boolean;
    readAt: Date | null;
    pushStatus: NotificationStatus;
    createdAt: Date;
    notification: {
      title: string;
      message: string;
      type: NotificationType;
      targetType: NotificationTargetType;
      metadata: unknown;
      sender: { fullName: string };
    };
  }) {
    return {
      id: row.id,
      recipientId: row.id,
      notificationId: row.notificationId,
      title: row.notification.title,
      message: row.notification.message,
      type: row.notification.type,
      targetType: row.notification.targetType,
      metadata: row.notification.metadata as Record<string, unknown> | null,
      senderName: row.notification.sender.fullName,
      isRead: row.isRead,
      readAt: row.readAt,
      pushStatus: row.pushStatus,
      createdAt: row.createdAt,
    };
  }
}
