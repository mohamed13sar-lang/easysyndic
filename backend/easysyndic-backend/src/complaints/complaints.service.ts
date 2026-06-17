import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ComplaintMediaType, ComplaintStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AddComplaintCommentDto } from './dto/add-complaint-comment.dto';
import { AddComplaintMediaDto } from './dto/add-complaint-media.dto';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { CreateMyComplaintDto } from './dto/create-my-complaint.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';

type AuthUser = {
  id: string;
  role: UserRole;
  permissionChecked?: { residenceId: string };
};

@Injectable()
export class ComplaintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findMyComplaints(
    currentUser: AuthUser,
    filters: { residenceId?: string; apartmentId?: string },
  ) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }

    if (filters.residenceId && filters.apartmentId) {
      await this.ensureResidentAssignment(
        currentUser.id,
        filters.apartmentId,
        filters.residenceId,
      );
    }

    const complaints = await this.prisma.complaint.findMany({
      where: {
        residentId: currentUser.id,
        isActive: true,
        ...(filters.residenceId ? { residenceId: filters.residenceId } : {}),
        ...(filters.apartmentId ? { apartmentId: filters.apartmentId } : {}),
      },
      include: this.complaintInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return complaints.map((c) =>
      this.toComplaintResponse(c, currentUser, false),
    );
  }

  async createMyComplaint(dto: CreateMyComplaintDto, currentUser: AuthUser) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }

    await this.ensureResidentAssignment(
      currentUser.id,
      dto.apartmentId,
      dto.residenceId,
    );

    return this.create(
      dto.residenceId,
      {
        apartmentId: dto.apartmentId,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        urgency: dto.urgency,
      },
      currentUser,
    );
  }

  async findMyComplaint(id: string, currentUser: AuthUser) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }

    const complaint = await this.getComplaintByIdOrThrow(id);
    if (complaint.residentId !== currentUser.id) {
      throw new ForbiddenException('Forbidden');
    }

    return this.toComplaintResponse(complaint, currentUser, true);
  }

  async create(
    residenceId: string,
    dto: CreateComplaintDto,
    currentUser: AuthUser,
  ) {
    const residence = await this.getResidenceOrThrow(residenceId);
    const apartment = await this.getApartmentOrThrow(dto.apartmentId);
    if (apartment.residenceId !== residenceId) {
      throw new ForbiddenException(
        'Apartment does not belong to this residence',
      );
    }

    if (currentUser.role === UserRole.RESIDENT) {
      await this.ensureResidentAssignment(
        currentUser.id,
        apartment.id,
        residenceId,
      );
    } else if (currentUser.role === UserRole.SYNDIC) {
      this.assertSyndicResidenceAccess(currentUser.id, residence.syndicId);
    } else if (currentUser.permissionChecked?.residenceId === residenceId) {
      // Access was granted by PermissionsGuard for this request.
    } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Forbidden');
    }

    const residentId = currentUser.id;
    const resident = await this.prisma.user.findUnique({
      where: { id: residentId },
    });
    if (!resident || !resident.isActive) {
      throw new NotFoundException('Active user not found');
    }

    const complaint = await this.prisma.complaint.create({
      data: {
        residenceId,
        apartmentId: apartment.id,
        residentId,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        urgency: dto.urgency,
        isAnonymous: dto.isAnonymous ?? false,
      },
      include: this.complaintInclude(),
    });

    if (dto.media?.length) {
      await this.prisma.complaintMedia.createMany({
        data: dto.media.map((m) => ({
          complaintId: complaint.id,
          fileUrl: this.resolveMediaUrl(m),
          fileType: this.resolveMediaType(m),
          fileName: m.fileName,
          mimeType: m.mimeType,
          size: m.size,
          uploadedById: currentUser.id,
        })),
      });
    }

    const reloaded = await this.getComplaintByIdOrThrow(complaint.id);
    return this.toComplaintResponse(reloaded, currentUser, true);
  }

  async findMyByResidence(residenceId: string, currentUser: AuthUser) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }
    await this.getResidenceOrThrow(residenceId);

    const complaints = await this.prisma.complaint.findMany({
      where: { residenceId, residentId: currentUser.id, isActive: true },
      include: this.complaintInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return complaints.map((c) =>
      this.toComplaintResponse(c, currentUser, false),
    );
  }

  async findByResidence(residenceId: string, currentUser: AuthUser) {
    const residence = await this.getResidenceOrThrow(residenceId);
    if (currentUser.role === UserRole.SYNDIC) {
      this.assertSyndicResidenceAccess(currentUser.id, residence.syndicId);
    } else if (currentUser.permissionChecked?.residenceId === residenceId) {
      // Access was granted by PermissionsGuard for this request.
    } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Forbidden');
    }

    const complaints = await this.prisma.complaint.findMany({
      where: { residenceId, isActive: true },
      include: this.complaintInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return complaints.map((c) =>
      this.toComplaintResponse(c, currentUser, false),
    );
  }

  async findOne(id: string, currentUser: AuthUser) {
    const complaint = await this.getComplaintByIdOrThrow(id);
    this.assertComplaintAccess(currentUser, complaint);
    return this.toComplaintResponse(complaint, currentUser, true);
  }

  async findOneInResidence(
    residenceId: string,
    complaintId: string,
    currentUser: AuthUser,
  ) {
    const complaint = await this.getComplaintByIdOrThrow(complaintId);
    this.assertComplaintInResidence(complaint, residenceId);
    this.assertComplaintAccess(currentUser, complaint);
    return this.toComplaintResponse(complaint, currentUser, true);
  }

  async update(id: string, dto: UpdateComplaintDto, currentUser: AuthUser) {
    const complaint = await this.getComplaintByIdOrThrow(id);
    this.assertComplaintAccess(currentUser, complaint);

    if (currentUser.role === UserRole.RESIDENT) {
      if (
        complaint.residentId !== currentUser.id ||
        complaint.status !== ComplaintStatus.NOUVELLE
      ) {
        throw new ForbiddenException(
          'Resident can only update own NOUVELLE complaints',
        );
      }
      dto.assignedToId = undefined;
      dto.sentToLhrayfi = undefined;
    }

    if (dto.assignedToId) {
      const assigned = await this.prisma.user.findUnique({
        where: { id: dto.assignedToId },
        select: { id: true, isActive: true },
      });
      if (!assigned || !assigned.isActive) {
        throw new NotFoundException(
          `Assigned user with id "${dto.assignedToId}" not found`,
        );
      }
    }

    const updated = await this.prisma.complaint.update({
      where: { id },
      data: dto,
      include: this.complaintInclude(),
    });
    return this.toComplaintResponse(updated, currentUser, true);
  }

  async updateStatus(
    id: string,
    dto: UpdateComplaintStatusDto,
    currentUser: AuthUser,
  ) {
    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.role !== UserRole.SYNDIC
    ) {
      throw new ForbiddenException('Forbidden');
    }
    const complaint = await this.getComplaintByIdOrThrow(id);
    this.assertComplaintAccess(currentUser, complaint);

    const closingStatuses: ComplaintStatus[] = [
      ComplaintStatus.FERMEE,
      ComplaintStatus.RESOLUE,
      ComplaintStatus.REFUSEE,
    ];

    const updated = await this.prisma.complaint.update({
      where: { id },
      data: {
        status: dto.status,
        closedAt: closingStatuses.includes(dto.status)
          ? new Date()
          : complaint.closedAt,
      },
      include: this.complaintInclude(),
    });

    await this.notificationsService.sendComplaintStatusNotification(
      id,
      dto.status,
      currentUser.id,
    );

    return this.toComplaintResponse(updated, currentUser, true);
  }

  async updateStatusInResidence(
    residenceId: string,
    complaintId: string,
    dto: UpdateComplaintStatusDto,
    currentUser: AuthUser,
  ) {
    const complaint = await this.getComplaintByIdOrThrow(complaintId);
    this.assertComplaintInResidence(complaint, residenceId);
    return this.updateStatus(complaintId, dto, currentUser);
  }

  async remove(id: string, currentUser: AuthUser) {
    const complaint = await this.getComplaintByIdOrThrow(id);
    this.assertComplaintAccess(currentUser, complaint);

    if (currentUser.role === UserRole.RESIDENT) {
      if (
        complaint.residentId !== currentUser.id ||
        complaint.status !== ComplaintStatus.NOUVELLE
      ) {
        throw new ForbiddenException(
          'Resident can only delete own NOUVELLE complaints',
        );
      }
    } else if (currentUser.role === UserRole.SYNDIC) {
      this.assertSyndicResidenceAccess(
        currentUser.id,
        complaint.residence.syndicId,
      );
    } else if (currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Forbidden');
    }

    const updated = await this.prisma.complaint.update({
      where: { id },
      data: { isActive: false },
      include: this.complaintInclude(),
    });
    return this.toComplaintResponse(updated, currentUser, true);
  }

  async addMedia(id: string, dto: AddComplaintMediaDto, currentUser: AuthUser) {
    const complaint = await this.getComplaintByIdOrThrow(id);
    this.assertComplaintAccess(currentUser, complaint);
    const media = await this.prisma.complaintMedia.create({
      data: {
        complaintId: id,
        fileUrl: this.resolveMediaUrl(dto),
        fileType: this.resolveMediaType(dto),
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        size: dto.size,
        uploadedById: currentUser.id,
      },
    });
    return this.toMediaResponse(media);
  }

  async addMyMedia(
    complaintId: string,
    dto: AddComplaintMediaDto,
    currentUser: AuthUser,
  ) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }

    const complaint = await this.getComplaintByIdOrThrow(complaintId);
    if (complaint.residentId !== currentUser.id) {
      throw new ForbiddenException('Forbidden');
    }

    return this.addMedia(complaintId, dto, currentUser);
  }

  async findMyMedia(complaintId: string, currentUser: AuthUser) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }

    const complaint = await this.getComplaintByIdOrThrow(complaintId);
    if (complaint.residentId !== currentUser.id) {
      throw new ForbiddenException('Forbidden');
    }

    return this.findMedia(complaintId, currentUser);
  }

  async addMediaInResidence(
    residenceId: string,
    complaintId: string,
    dto: AddComplaintMediaDto,
    currentUser: AuthUser,
  ) {
    const complaint = await this.getComplaintByIdOrThrow(complaintId);
    this.assertComplaintInResidence(complaint, residenceId);
    this.assertComplaintAccess(currentUser, complaint);
    return this.addMedia(complaintId, dto, currentUser);
  }

  async findMediaInResidence(
    residenceId: string,
    complaintId: string,
    currentUser: AuthUser,
  ) {
    const complaint = await this.getComplaintByIdOrThrow(complaintId);
    this.assertComplaintInResidence(complaint, residenceId);
    this.assertComplaintAccess(currentUser, complaint);
    return this.findMedia(complaintId, currentUser);
  }

  async findMedia(id: string, currentUser: AuthUser) {
    const complaint = await this.getComplaintByIdOrThrow(id);
    this.assertComplaintAccess(currentUser, complaint);
    const media = await this.prisma.complaintMedia.findMany({
      where: { complaintId: id },
      orderBy: { createdAt: 'asc' },
    });
    return media.map((item) => this.toMediaResponse(item));
  }

  async addComment(
    id: string,
    dto: AddComplaintCommentDto,
    currentUser: AuthUser,
  ) {
    const complaint = await this.getComplaintByIdOrThrow(id);
    this.assertComplaintAccess(currentUser, complaint);

    const isInternal =
      currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.SYNDIC
        ? (dto.isInternal ?? false)
        : false;

    return this.prisma.complaintComment.create({
      data: {
        complaintId: id,
        userId: currentUser.id,
        comment: dto.comment,
        isInternal,
      },
    });
  }

  async addCommentInResidence(
    residenceId: string,
    complaintId: string,
    dto: AddComplaintCommentDto,
    currentUser: AuthUser,
  ) {
    const complaint = await this.getComplaintByIdOrThrow(complaintId);
    this.assertComplaintInResidence(complaint, residenceId);
    return this.addComment(complaintId, dto, currentUser);
  }

  async findComments(id: string, currentUser: AuthUser) {
    const complaint = await this.getComplaintByIdOrThrow(id);
    this.assertComplaintAccess(currentUser, complaint);
    return this.prisma.complaintComment.findMany({
      where: {
        complaintId: id,
        ...(currentUser.role === UserRole.RESIDENT
          ? { isInternal: false }
          : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async ensureResidentAssignment(
    userId: string,
    apartmentId: string,
    residenceId: string,
  ) {
    const assignment = await this.prisma.residentApartment.findUnique({
      where: { userId_apartmentId: { userId, apartmentId } },
      select: { id: true, residenceId: true, isActive: true },
    });
    if (
      !assignment ||
      assignment.residenceId !== residenceId ||
      !assignment.isActive
    ) {
      throw new ForbiddenException(
        'Resident is not assigned to this apartment in this residence',
      );
    }
  }

  private assertSyndicResidenceAccess(
    syndicId: string,
    complaintSyndicId: string,
  ) {
    if (syndicId !== complaintSyndicId) {
      throw new ForbiddenException(
        'You can only access complaints in your own residences',
      );
    }
  }

  private assertComplaintAccess(
    currentUser: AuthUser,
    complaint: Awaited<ReturnType<typeof this.getComplaintByIdOrThrow>>,
  ) {
    if (currentUser.role === UserRole.SUPER_ADMIN) return;
    if (currentUser.role === UserRole.SYNDIC) {
      this.assertSyndicResidenceAccess(
        currentUser.id,
        complaint.residence.syndicId,
      );
      return;
    }
    if (
      currentUser.permissionChecked?.residenceId === complaint.residence.id
    ) {
      return;
    }
    if (
      currentUser.role === UserRole.RESIDENT &&
      complaint.residentId === currentUser.id
    ) {
      return;
    }
    throw new ForbiddenException('Forbidden');
  }

  private assertComplaintInResidence(
    complaint: Awaited<ReturnType<typeof this.getComplaintByIdOrThrow>>,
    residenceId: string,
  ) {
    if (complaint.residenceId !== residenceId) {
      throw new NotFoundException(
        `Complaint with id "${complaint.id}" not found in this residence`,
      );
    }
  }

  private complaintInclude() {
    return {
      residence: { select: { id: true, syndicId: true } },
      apartment: {
        select: { id: true, number: true, block: true, floor: true },
      },
      resident: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
      media: true,
      _count: { select: { comments: true } },
    } as const;
  }

  private async getResidenceOrThrow(id: string) {
    const residence = await this.prisma.residence.findUnique({
      where: { id },
      select: { id: true, syndicId: true },
    });
    if (!residence)
      throw new NotFoundException(`Residence with id "${id}" not found`);
    return residence;
  }

  private async getApartmentOrThrow(id: string) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
      select: { id: true, residenceId: true },
    });
    if (!apartment)
      throw new NotFoundException(`Apartment with id "${id}" not found`);
    return apartment;
  }

  private async getComplaintByIdOrThrow(id: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: this.complaintInclude(),
    });
    if (!complaint)
      throw new NotFoundException(`Complaint with id "${id}" not found`);
    return complaint;
  }

  private toComplaintResponse(
    complaint: Awaited<ReturnType<typeof this.getComplaintByIdOrThrow>>,
    currentUser: AuthUser,
    includeResidentObject: boolean,
  ) {
    const exposeResident =
      !complaint.isAnonymous || currentUser.role === UserRole.SUPER_ADMIN;
    return {
      id: complaint.id,
      residenceId: complaint.residenceId,
      apartmentId: complaint.apartmentId,
      residentId: exposeResident ? complaint.residentId : null,
      resident:
        includeResidentObject && exposeResident ? complaint.resident : null,
      apartment: complaint.apartment,
      category: complaint.category,
      title: complaint.title,
      description: complaint.description,
      urgency: complaint.urgency,
      status: complaint.status,
      assignedToId: complaint.assignedToId,
      sentToLhrayfi: complaint.sentToLhrayfi,
      isAnonymous: complaint.isAnonymous,
      isActive: complaint.isActive,
      createdAt: complaint.createdAt,
      updatedAt: complaint.updatedAt,
      closedAt: complaint.closedAt,
      media: complaint.media.map((item) => this.toMediaResponse(item)),
      commentsCount: complaint._count.comments,
    };
  }

  private resolveMediaUrl(dto: { fileUrl?: string; url?: string }) {
    const url = dto.fileUrl ?? dto.url;
    if (!url?.trim()) {
      throw new BadRequestException('Media url is required');
    }
    return url.trim();
  }

  private resolveMediaType(dto: {
    fileType?: ComplaintMediaType;
    type?: ComplaintMediaType;
  }) {
    const type = dto.fileType ?? dto.type;
    if (!type) {
      throw new BadRequestException('Media type is required');
    }
    return type;
  }

  private toMediaResponse(media: {
    id: string;
    complaintId: string;
    fileUrl: string;
    fileType: ComplaintMediaType;
    fileName: string | null;
    mimeType: string | null;
    size: number | null;
    uploadedById?: string | null;
    createdAt: Date;
  }) {
    return {
      ...media,
      url: media.fileUrl,
      type: media.fileType,
      uploadedById: media.uploadedById ?? null,
    };
  }
}
