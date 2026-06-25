import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssemblyStatus,
  AssemblyVoteValue,
  NotificationTargetType,
  NotificationType,
  ParticipantStatus,
  ResolutionVotingStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AgendaItemDto } from './dto/agenda-item.dto';
import { CreateAssemblyDto } from './dto/create-assembly.dto';
import { ResolutionDto } from './dto/resolution.dto';
import { UpdateAssemblyDto } from './dto/update-assembly.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';

type AuthUser = {
  id: string;
  role: UserRole;
  permissionChecked?: { residenceId: string };
};

@Injectable()
export class AssembliesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByResidence(residenceId: string, currentUser: AuthUser) {
    await this.ensureSyndicResidenceAccess(residenceId, currentUser);
    return this.prisma.assemblyGeneral.findMany({
      where: { residenceId },
      include: this.listInclude(),
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async create(
    residenceId: string,
    dto: CreateAssemblyDto,
    currentUser: AuthUser,
  ) {
    await this.ensureSyndicResidenceAccess(residenceId, currentUser);
    return this.prisma.assemblyGeneral.create({
      data: {
        residenceId,
        createdById: currentUser.id,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        scheduledAt: this.parseDate(dto.scheduledAt, 'scheduledAt'),
        location: dto.location,
        meetingLink: dto.meetingLink,
        quorumRequired: dto.quorumRequired,
      },
      include: this.detailInclude(),
    });
  }

  async findOneInResidence(
    residenceId: string,
    assemblyId: string,
    currentUser: AuthUser,
  ) {
    await this.ensureSyndicResidenceAccess(residenceId, currentUser);
    return this.getAssemblyInResidenceOrThrow(residenceId, assemblyId);
  }

  async update(
    residenceId: string,
    assemblyId: string,
    dto: UpdateAssemblyDto,
    currentUser: AuthUser,
  ) {
    const assembly = await this.getEditableAssembly(
      residenceId,
      assemblyId,
      currentUser,
    );
    return this.prisma.assemblyGeneral.update({
      where: { id: assembly.id },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        scheduledAt:
          dto.scheduledAt === undefined
            ? undefined
            : this.parseDate(dto.scheduledAt, 'scheduledAt'),
        location: dto.location,
        meetingLink: dto.meetingLink,
        quorumRequired: dto.quorumRequired,
      },
      include: this.detailInclude(),
    });
  }

  async updateStatus(
    residenceId: string,
    assemblyId: string,
    status: AssemblyStatus,
    currentUser: AuthUser,
  ) {
    await this.ensureSyndicResidenceAccess(residenceId, currentUser);
    const assembly = await this.getAssemblyInResidenceOrThrow(
      residenceId,
      assemblyId,
    );
    if (
      assembly.status === AssemblyStatus.CLOSED &&
      currentUser.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ConflictException('Une AG cloturee ne peut plus etre modifiee');
    }

    const updated = await this.prisma.assemblyGeneral.update({
      where: { id: assemblyId },
      data: { status },
      include: this.detailInclude(),
    });

    if (status === AssemblyStatus.PUBLISHED) {
      await this.ensureParticipants(assemblyId, residenceId);
      await this.notifyResidents(
        residenceId,
        currentUser.id,
        'Nouvelle Assemblee Generale',
        'Une nouvelle assemblee generale est programmee.',
        { assemblyId },
      );
    }

    return updated;
  }

  async remove(residenceId: string, assemblyId: string, currentUser: AuthUser) {
    await this.ensureSyndicResidenceAccess(residenceId, currentUser);
    const assembly = await this.getAssemblyInResidenceOrThrow(
      residenceId,
      assemblyId,
    );
    if (assembly.status !== AssemblyStatus.DRAFT) {
      throw new ConflictException('Seule une AG brouillon peut etre supprimee');
    }
    await this.prisma.assemblyGeneral.delete({ where: { id: assemblyId } });
    return { deleted: true };
  }

  async addAgendaItem(
    residenceId: string,
    assemblyId: string,
    dto: AgendaItemDto,
    currentUser: AuthUser,
  ) {
    await this.getEditableAssembly(residenceId, assemblyId, currentUser);
    const order = dto.order ?? (await this.nextAgendaOrder(assemblyId));
    return this.prisma.assemblyAgendaItem.create({
      data: {
        assemblyId,
        title: dto.title,
        description: dto.description,
        order,
      },
    });
  }

  async updateAgendaItem(
    residenceId: string,
    assemblyId: string,
    itemId: string,
    dto: AgendaItemDto,
    currentUser: AuthUser,
  ) {
    await this.getEditableAssembly(residenceId, assemblyId, currentUser);
    await this.ensureAgendaItem(assemblyId, itemId);
    return this.prisma.assemblyAgendaItem.update({
      where: { id: itemId },
      data: {
        title: dto.title,
        description: dto.description,
        order: dto.order,
      },
    });
  }

  async deleteAgendaItem(
    residenceId: string,
    assemblyId: string,
    itemId: string,
    currentUser: AuthUser,
  ) {
    await this.getEditableAssembly(residenceId, assemblyId, currentUser);
    await this.ensureAgendaItem(assemblyId, itemId);
    await this.prisma.assemblyAgendaItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  async createResolution(
    residenceId: string,
    assemblyId: string,
    dto: ResolutionDto,
    currentUser: AuthUser,
  ) {
    await this.getEditableAssembly(residenceId, assemblyId, currentUser);
    const order = dto.order ?? (await this.nextResolutionOrder(assemblyId));
    return this.prisma.assemblyResolution.create({
      data: {
        assemblyId,
        title: dto.title,
        description: dto.description,
        order,
      },
      include: { votes: true },
    });
  }

  async updateResolution(
    residenceId: string,
    assemblyId: string,
    resolutionId: string,
    dto: ResolutionDto,
    currentUser: AuthUser,
  ) {
    await this.getEditableAssembly(residenceId, assemblyId, currentUser);
    await this.ensureResolution(assemblyId, resolutionId);
    return this.prisma.assemblyResolution.update({
      where: { id: resolutionId },
      data: {
        title: dto.title,
        description: dto.description,
        order: dto.order,
      },
      include: { votes: true },
    });
  }

  async updateVotingStatus(
    residenceId: string,
    assemblyId: string,
    resolutionId: string,
    votingStatus: ResolutionVotingStatus,
    currentUser: AuthUser,
  ) {
    await this.ensureSyndicResidenceAccess(residenceId, currentUser);
    const assembly = await this.getAssemblyInResidenceOrThrow(
      residenceId,
      assemblyId,
    );
    if (
      assembly.status === AssemblyStatus.DRAFT ||
      assembly.status === AssemblyStatus.CANCELLED
    ) {
      throw new ConflictException('Publiez l AG avant d ouvrir un vote');
    }
    await this.ensureResolution(assemblyId, resolutionId);
    const resolution = await this.prisma.assemblyResolution.update({
      where: { id: resolutionId },
      data: { votingStatus },
      include: { votes: true },
    });
    if (votingStatus === ResolutionVotingStatus.OPEN) {
      await this.notifyResidents(
        residenceId,
        currentUser.id,
        'Vote ouvert',
        'Un vote est ouvert pour une resolution.',
        { assemblyId, resolutionId },
      );
    }
    return resolution;
  }

  async findParticipants(
    residenceId: string,
    assemblyId: string,
    currentUser: AuthUser,
  ) {
    await this.ensureSyndicResidenceAccess(residenceId, currentUser);
    await this.getAssemblyInResidenceOrThrow(residenceId, assemblyId);
    await this.ensureParticipants(assemblyId, residenceId);
    return this.prisma.assemblyParticipant.findMany({
      where: { assemblyId },
      include: {
        user: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
        apartment: {
          select: { id: true, number: true, block: true, floor: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateParticipant(
    residenceId: string,
    assemblyId: string,
    participantId: string,
    dto: UpdateParticipantDto,
    currentUser: AuthUser,
  ) {
    await this.ensureSyndicResidenceAccess(residenceId, currentUser);
    await this.getAssemblyInResidenceOrThrow(residenceId, assemblyId);
    const participant = await this.prisma.assemblyParticipant.findUnique({
      where: { id: participantId },
    });
    if (!participant || participant.assemblyId !== assemblyId) {
      throw new NotFoundException('Participant introuvable');
    }
    return this.prisma.assemblyParticipant.update({
      where: { id: participantId },
      data: {
        status: dto.status,
        representedByName: dto.representedByName,
        checkedInAt:
          dto.status === ParticipantStatus.PRESENT ? new Date() : null,
      },
    });
  }

  async findResults(
    residenceId: string,
    assemblyId: string,
    currentUser: AuthUser,
  ) {
    await this.ensureSyndicResidenceAccess(residenceId, currentUser);
    await this.getAssemblyInResidenceOrThrow(residenceId, assemblyId);
    return this.buildResults(assemblyId);
  }

  async findMine(currentUser: AuthUser, residenceId?: string) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }
    if (!residenceId) throw new ForbiddenException('residenceId is required');
    await this.ensureResidentResidenceAccess(currentUser.id, residenceId);
    return this.prisma.assemblyGeneral.findMany({
      where: {
        residenceId,
        status: {
          in: [
            AssemblyStatus.PUBLISHED,
            AssemblyStatus.IN_PROGRESS,
            AssemblyStatus.CLOSED,
          ],
        },
      },
      include: this.listInclude(),
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async findMineOne(assemblyId: string, currentUser: AuthUser) {
    const assembly = await this.prisma.assemblyGeneral.findUnique({
      where: { id: assemblyId },
      include: this.detailInclude(),
    });
    if (!assembly || assembly.status === AssemblyStatus.DRAFT) {
      throw new NotFoundException('AG introuvable');
    }
    await this.ensureResidentResidenceAccess(
      currentUser.id,
      assembly.residenceId,
    );
    return assembly;
  }

  async updateMyAttendance(
    assemblyId: string,
    dto: UpdateAttendanceDto,
    currentUser: AuthUser,
  ) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }
    if (dto.status === ParticipantStatus.INVITED) {
      throw new BadRequestException('Statut de presence invalide');
    }
    const assembly = await this.findMineOne(assemblyId, currentUser);
    const assignment = await this.getResidentAssignment(
      currentUser.id,
      assembly.residenceId,
    );
    await this.ensureParticipants(assemblyId, assembly.residenceId);
    return this.prisma.assemblyParticipant.upsert({
      where: {
        assemblyId_userId_apartmentId: {
          assemblyId,
          userId: currentUser.id,
          apartmentId: assignment.apartmentId,
        },
      },
      update: {
        status: dto.status,
        representedByName: dto.representedByName,
        checkedInAt:
          dto.status === ParticipantStatus.PRESENT ? new Date() : null,
      },
      create: {
        assemblyId,
        userId: currentUser.id,
        apartmentId: assignment.apartmentId,
        status: dto.status,
        representedByName: dto.representedByName,
        checkedInAt:
          dto.status === ParticipantStatus.PRESENT ? new Date() : null,
      },
    });
  }

  async vote(
    assemblyId: string,
    resolutionId: string,
    vote: AssemblyVoteValue,
    currentUser: AuthUser,
  ) {
    const assembly = await this.findMineOne(assemblyId, currentUser);
    const resolution = await this.ensureResolution(assemblyId, resolutionId);
    if (resolution.votingStatus !== ResolutionVotingStatus.OPEN) {
      throw new ConflictException('Le vote n est pas ouvert');
    }
    const existing = await this.prisma.assemblyVote.findFirst({
      where: { resolutionId, userId: currentUser.id },
    });
    if (existing) {
      throw new ConflictException('Vous avez deja vote pour cette resolution');
    }
    const assignment = await this.getResidentAssignment(
      currentUser.id,
      assembly.residenceId,
    );
    return this.prisma.assemblyVote.create({
      data: {
        resolutionId,
        userId: currentUser.id,
        apartmentId: assignment.apartmentId,
        vote,
      },
    });
  }

  async findMyResults(assemblyId: string, currentUser: AuthUser) {
    const assembly = await this.findMineOne(assemblyId, currentUser);
    const canSee =
      assembly.status === AssemblyStatus.CLOSED ||
      assembly.resolutions.every(
        (r) => r.votingStatus === ResolutionVotingStatus.CLOSED,
      );
    if (!canSee) {
      throw new ForbiddenException('Resultats indisponibles avant la cloture');
    }
    return this.buildResults(assemblyId);
  }

  private async getEditableAssembly(
    residenceId: string,
    assemblyId: string,
    currentUser: AuthUser,
  ) {
    await this.ensureSyndicResidenceAccess(residenceId, currentUser);
    const assembly = await this.getAssemblyInResidenceOrThrow(
      residenceId,
      assemblyId,
    );
    const lockedStatuses: AssemblyStatus[] = [
      AssemblyStatus.CLOSED,
      AssemblyStatus.CANCELLED,
    ];
    if (
      lockedStatuses.includes(assembly.status) &&
      currentUser.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ConflictException('Cette AG ne peut plus etre modifiee');
    }
    return assembly;
  }

  private async getAssemblyInResidenceOrThrow(
    residenceId: string,
    assemblyId: string,
  ) {
    const assembly = await this.prisma.assemblyGeneral.findFirst({
      where: { id: assemblyId, residenceId },
      include: this.detailInclude(),
    });
    if (!assembly) throw new NotFoundException('AG introuvable');
    return assembly;
  }

  private async ensureSyndicResidenceAccess(
    residenceId: string,
    currentUser: AuthUser,
  ) {
    const residence = await this.prisma.residence.findUnique({
      where: { id: residenceId },
      select: { id: true, syndicId: true },
    });
    if (!residence) throw new NotFoundException('Residence introuvable');
    if (currentUser.role === UserRole.SUPER_ADMIN) return residence;
    if (
      currentUser.role === UserRole.SYNDIC &&
      residence.syndicId === currentUser.id
    )
      return residence;
    if (currentUser.permissionChecked?.residenceId === residenceId)
      return residence;
    throw new ForbiddenException('Acces residence refuse');
  }

  private async ensureResidentResidenceAccess(
    userId: string,
    residenceId: string,
  ) {
    await this.getResidentAssignment(userId, residenceId);
  }

  private async getResidentAssignment(userId: string, residenceId: string) {
    const assignment = await this.prisma.residentApartment.findFirst({
      where: {
        userId,
        residenceId,
        isActive: true,
        user: { role: UserRole.RESIDENT, isActive: true },
      },
      select: { apartmentId: true },
    });
    if (!assignment) {
      throw new ForbiddenException('Resident non associe a cette residence');
    }
    return assignment;
  }

  private async ensureParticipants(assemblyId: string, residenceId: string) {
    const assignments = await this.prisma.residentApartment.findMany({
      where: {
        residenceId,
        isActive: true,
        user: { role: UserRole.RESIDENT, isActive: true },
      },
      select: { userId: true, apartmentId: true },
    });
    await this.prisma.$transaction(
      assignments.map((assignment) =>
        this.prisma.assemblyParticipant.upsert({
          where: {
            assemblyId_userId_apartmentId: {
              assemblyId,
              userId: assignment.userId,
              apartmentId: assignment.apartmentId,
            },
          },
          update: {},
          create: {
            assemblyId,
            userId: assignment.userId,
            apartmentId: assignment.apartmentId,
            status: ParticipantStatus.INVITED,
          },
        }),
      ),
    );
  }

  private async ensureAgendaItem(assemblyId: string, itemId: string) {
    const item = await this.prisma.assemblyAgendaItem.findFirst({
      where: { id: itemId, assemblyId },
    });
    if (!item) throw new NotFoundException('Point d ordre du jour introuvable');
    return item;
  }

  private async ensureResolution(assemblyId: string, resolutionId: string) {
    const resolution = await this.prisma.assemblyResolution.findFirst({
      where: { id: resolutionId, assemblyId },
      include: { votes: true },
    });
    if (!resolution) throw new NotFoundException('Resolution introuvable');
    return resolution;
  }

  private async nextAgendaOrder(assemblyId: string) {
    const count = await this.prisma.assemblyAgendaItem.count({
      where: { assemblyId },
    });
    return count + 1;
  }

  private async nextResolutionOrder(assemblyId: string) {
    const count = await this.prisma.assemblyResolution.count({
      where: { assemblyId },
    });
    return count + 1;
  }

  private async buildResults(assemblyId: string) {
    const resolutions = await this.prisma.assemblyResolution.findMany({
      where: { assemblyId },
      include: { votes: true },
      orderBy: { order: 'asc' },
    });
    return resolutions.map((resolution) => {
      const totals = {
        YES: 0,
        NO: 0,
        ABSTAIN: 0,
      } satisfies Record<AssemblyVoteValue, number>;
      for (const item of resolution.votes) totals[item.vote] += 1;
      return {
        resolutionId: resolution.id,
        title: resolution.title,
        votingStatus: resolution.votingStatus,
        totalVotes: resolution.votes.length,
        results: totals,
      };
    });
  }

  private async notifyResidents(
    residenceId: string,
    senderId: string,
    title: string,
    message: string,
    metadata: Record<string, string>,
  ) {
    const recipients = await this.prisma.residentApartment.findMany({
      where: {
        residenceId,
        isActive: true,
        user: { role: UserRole.RESIDENT, isActive: true },
      },
      distinct: ['userId'],
      select: { userId: true },
    });
    if (!recipients.length) return null;
    return this.prisma.notification.create({
      data: {
        residenceId,
        senderId,
        title,
        message,
        type: NotificationType.GENERAL,
        targetType: NotificationTargetType.RESIDENCE,
        targetId: residenceId,
        metadata,
        recipients: {
          createMany: {
            data: recipients.map((item) => ({ userId: item.userId })),
            skipDuplicates: true,
          },
        },
      },
    });
  }

  private parseDate(value: string, field: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} doit etre une date valide`);
    }
    return parsed;
  }

  private listInclude() {
    return {
      _count: {
        select: { agendaItems: true, participants: true, resolutions: true },
      },
    } as const;
  }

  private detailInclude() {
    return {
      agendaItems: { orderBy: { order: 'asc' as const } },
      documents: { orderBy: { createdAt: 'desc' as const } },
      participants: {
        include: {
          user: {
            select: { id: true, fullName: true, phone: true, email: true },
          },
          apartment: {
            select: { id: true, number: true, block: true, floor: true },
          },
        },
        orderBy: { createdAt: 'asc' as const },
      },
      resolutions: {
        include: { votes: true },
        orderBy: { order: 'asc' as const },
      },
    } as const;
  }
}
