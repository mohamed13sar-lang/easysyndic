import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AnnouncementPriority,
  AnnouncementType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementStatusDto } from './dto/update-announcement-status.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

type AuthUser = {
  id: string;
  role: UserRole;
  permissionChecked?: { residenceId: string };
};

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findByResidence(residenceId: string, currentUser: AuthUser) {
    await this.ensureSyndicResidenceAccess(residenceId, currentUser);

    const announcements = await this.prisma.announcement.findMany({
      where: {
        residenceId,
        isActive: true,
        ...this.notExpiredFilter(),
      },
      orderBy: [
        { priority: 'desc' },
        { publishAt: 'desc' },
        { createdAt: 'desc' },
      ],
      include: this.defaultIncludes(),
    });

    return announcements.map((announcement) =>
      this.toAnnouncementResponse(announcement),
    );
  }

  async create(
    residenceId: string,
    dto: CreateAnnouncementDto,
    currentUser: AuthUser,
  ) {
    await this.ensureSyndicResidenceAccess(residenceId, currentUser);
    const publishAt = this.parsePublishAt(dto.publishAt);
    const expiresAt = this.parseOptionalExpiresAt(dto.expiresAt);

    const announcement = await this.prisma.announcement.create({
      data: {
        residenceId,
        createdById: currentUser.id,
        title: dto.title,
        message: dto.message,
        type: dto.type,
        priority: dto.priority ?? AnnouncementPriority.NORMAL,
        publishAt,
        expiresAt,
        isActive: true,
      },
      include: this.defaultIncludes(),
    });

    await this.notificationsService.sendAnnouncementNotification(
      announcement.id,
      currentUser.id,
    );

    return this.toAnnouncementResponse(announcement);
  }

  async updateInResidence(
    residenceId: string,
    announcementId: string,
    dto: UpdateAnnouncementDto,
    currentUser: AuthUser,
  ) {
    await this.ensureSyndicResidenceAccess(residenceId, currentUser);
    await this.getAnnouncementInResidenceOrThrow(residenceId, announcementId);
    const publishAt =
      dto.publishAt === undefined
        ? undefined
        : this.parsePublishAt(dto.publishAt);
    const expiresAt =
      dto.expiresAt === undefined
        ? undefined
        : this.parseOptionalExpiresAt(dto.expiresAt);

    const announcement = await this.prisma.announcement.update({
      where: { id: announcementId },
      data: {
        title: dto.title,
        message: dto.message,
        type: dto.type,
        priority: dto.priority,
        publishAt,
        expiresAt,
      },
      include: this.defaultIncludes(),
    });

    return this.toAnnouncementResponse(announcement);
  }

  async updateStatusInResidence(
    residenceId: string,
    announcementId: string,
    dto: UpdateAnnouncementStatusDto,
    currentUser: AuthUser,
  ) {
    await this.ensureSyndicResidenceAccess(residenceId, currentUser);
    await this.getAnnouncementInResidenceOrThrow(residenceId, announcementId);

    const announcement = await this.prisma.announcement.update({
      where: { id: announcementId },
      data: { isActive: dto.isActive },
      include: this.defaultIncludes(),
    });

    return this.toAnnouncementResponse(announcement);
  }

  async removeInResidence(
    residenceId: string,
    announcementId: string,
    currentUser: AuthUser,
  ) {
    await this.ensureSyndicResidenceAccess(residenceId, currentUser);
    await this.getAnnouncementInResidenceOrThrow(residenceId, announcementId);

    const announcement = await this.prisma.announcement.update({
      where: { id: announcementId },
      data: { isActive: false },
      include: this.defaultIncludes(),
    });

    return this.toAnnouncementResponse(announcement);
  }

  async findMine(currentUser: AuthUser, residenceId?: string, limit?: string) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }

    if (!residenceId) {
      throw new ForbiddenException('residenceId is required');
    }

    await this.ensureResidentResidenceAccess(currentUser.id, residenceId);
    const take =
      limit === undefined
        ? undefined
        : Math.max(1, Math.min(Number(limit), 20));

    const announcements = await this.prisma.announcement.findMany({
      where: {
        residenceId,
        isActive: true,
        publishAt: { lte: new Date() },
        ...this.notExpiredFilter(),
      },
      orderBy: [{ publishAt: 'desc' }, { createdAt: 'desc' }],
      take: Number.isFinite(take) ? take : undefined,
      include: this.defaultIncludes(),
    });

    this.logAnnouncementRead('findMine', {
      userId: currentUser.id,
      residenceId,
      count: announcements.length,
    });

    return announcements.map((announcement) =>
      this.toAnnouncementResponse(announcement),
    );
  }

  async findMineOne(announcementId: string, currentUser: AuthUser) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }

    const announcement = await this.prisma.announcement.findFirst({
      where: {
        id: announcementId,
        isActive: true,
        publishAt: { lte: new Date() },
        ...this.notExpiredFilter(),
      },
      include: this.defaultIncludes(),
    });

    if (!announcement) {
      throw new NotFoundException('Annonce introuvable ou non autorisée');
    }

    await this.ensureResidentResidenceAccess(
      currentUser.id,
      announcement.residenceId,
    );

    return this.toAnnouncementResponse(announcement);
  }

  private async ensureSyndicResidenceAccess(
    residenceId: string,
    currentUser: AuthUser,
  ) {
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.role !== UserRole.SYNDIC
    ) {
      throw new ForbiddenException('Accès non autorisé');
    }

    const residence = await this.prisma.residence.findUnique({
      where: { id: residenceId },
      select: { id: true, syndicId: true },
    });

    if (!residence) {
      throw new NotFoundException(
        `Residence with id "${residenceId}" not found`,
      );
    }

    if (
      currentUser.role === UserRole.SYNDIC &&
      residence.syndicId !== currentUser.id
    ) {
      throw new ForbiddenException('Accès non autorisé à cette résidence');
    }

    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.role !== UserRole.SYNDIC &&
      currentUser.permissionChecked?.residenceId !== residenceId
    ) {
      throw new ForbiddenException('Accès non autorisé à cette résidence');
    }

    return residence;
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
      throw new ForbiddenException('Résident non associé à cette résidence');
    }
  }

  private async getAnnouncementInResidenceOrThrow(
    residenceId: string,
    announcementId: string,
  ) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { id: true, residenceId: true },
    });

    if (!announcement || announcement.residenceId !== residenceId) {
      throw new NotFoundException('Annonce introuvable dans cette résidence');
    }

    return announcement;
  }

  private notExpiredFilter() {
    return {
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };
  }

  private parsePublishAt(value?: string) {
    if (!value) return new Date();
    return this.parseDateOrThrow(value, 'publishAt');
  }

  private parseOptionalExpiresAt(value?: string | null) {
    if (!value) return null;
    const date = this.parseDateOrThrow(value, 'expiresAt');
    if (date.getTime() <= Date.now()) {
      throw new BadRequestException(
        'La date d expiration doit etre dans le futur',
      );
    }
    return date;
  }

  private parseDateOrThrow(value: string, fieldName: string) {
    const parsed = new Date(value);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() < new Date().getFullYear()
    ) {
      throw new BadRequestException(
        `${fieldName} doit etre une date valide au format YYYY-MM-DD`,
      );
    }
    return parsed;
  }

  private defaultIncludes() {
    return {
      residence: { select: { id: true, name: true } },
      createdBy: { select: { id: true, fullName: true } },
    };
  }

  private toAnnouncementResponse(announcement: {
    id: string;
    residenceId: string;
    createdById: string;
    title: string;
    message: string;
    type: AnnouncementType;
    priority: AnnouncementPriority;
    publishAt: Date;
    expiresAt: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    residence?: { id: string; name: string };
    createdBy?: { id: string; fullName: string };
  }) {
    return {
      id: announcement.id,
      residenceId: announcement.residenceId,
      createdById: announcement.createdById,
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      priority: announcement.priority,
      publishAt: announcement.publishAt,
      expiresAt: announcement.expiresAt,
      isActive: announcement.isActive,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
      residence: announcement.residence,
      createdBy: announcement.createdBy,
    };
  }

  private logAnnouncementRead(scope: string, context: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'production') return;
    this.logger.log(`[${scope}] ${JSON.stringify(context)}`);
  }
}
