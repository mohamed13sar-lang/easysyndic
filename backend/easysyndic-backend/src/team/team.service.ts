import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberStatusDto } from './dto/update-team-member-status.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import {
  PERMISSION_TEMPLATES,
  TEAM_ROLES,
  getFullPermissionMap,
  mergePermissions,
} from './permissions.types';
import { TeamPermissionsService } from './team-permissions.service';

type AuthUser = { id: string; role: UserRole };

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: TeamPermissionsService,
  ) {}

  getPermissionTemplates() {
    return PERMISSION_TEMPLATES;
  }

  async getMyPermissions(residenceId: string, currentUser: AuthUser) {
    const residence = await this.prisma.residence.findUnique({
      where: { id: residenceId },
      select: { id: true, syndicId: true },
    });

    if (!residence) {
      throw new NotFoundException('Residence introuvable');
    }

    if (
      currentUser.role === UserRole.SUPER_ADMIN ||
      (currentUser.role === UserRole.SYNDIC && residence.syndicId === currentUser.id)
    ) {
      return this.getFullPermissions();
    }

    const membership = await this.prisma.syndicTeamMember.findFirst({
      where: { userId: currentUser.id, residenceId, isActive: true },
      select: { permissions: true },
    });

    if (!membership) {
      throw new NotFoundException('Permissions introuvables');
    }

    return membership.permissions;
  }

  async findByResidence(residenceId: string, currentUser: AuthUser) {
    await this.permissionsService.requirePermission(
      currentUser,
      residenceId,
      'team',
      'viewTeam',
    );

    const members = await this.prisma.syndicTeamMember.findMany({
      where: { residenceId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            isActive: true,
          },
        },
      },
    });

    return members.map((member) => ({
      id: member.id,
      userId: member.userId,
      residenceId: member.residenceId,
      role: member.role,
      permissions: member.permissions,
      isActive: member.isActive,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      user: member.user,
    }));
  }

  async create(dto: CreateTeamMemberDto, currentUser: AuthUser) {
    await this.permissionsService.requirePermission(
      currentUser,
      dto.residenceId,
      'team',
      'createMember',
    );
    await this.permissionsService.requirePermission(
      currentUser,
      dto.residenceId,
      'team',
      'editPermissions',
    );

    this.assertTeamRole(dto.role);

    const temporaryPassword =
      dto.temporaryPassword ?? this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const permissions = mergePermissions(dto.role, dto.permissions);

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: dto.phone },
          ...(dto.email ? [{ email: dto.email }] : []),
        ],
      },
    });

    const membership = await this.prisma.$transaction(async (tx) => {
      const user =
        existingUser ??
        (await tx.user.create({
          data: {
            fullName: dto.fullName,
            phone: dto.phone,
            email: dto.email,
            password: passwordHash,
            role: dto.role,
            isActive: true,
          },
        }));

      if (!TEAM_ROLES.includes(user.role)) {
        throw new ConflictException(
          'Cet utilisateur existe deja avec un role incompatible',
        );
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          fullName: dto.fullName,
          phone: dto.phone,
          email: dto.email,
          role: dto.role,
          password: user.password ? undefined : passwordHash,
          isActive: true,
        },
      });

      return tx.syndicTeamMember.create({
        data: {
          userId: user.id,
          residenceId: dto.residenceId,
          invitedById: currentUser.id,
          role: dto.role,
          permissions,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
              isActive: true,
            },
          },
        },
      });
    });

    return {
      id: membership.id,
      userId: membership.userId,
      residenceId: membership.residenceId,
      role: membership.role,
      permissions: membership.permissions,
      isActive: membership.isActive,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
      user: membership.user,
      temporaryPassword,
    };
  }

  async update(id: string, dto: UpdateTeamMemberDto, currentUser: AuthUser) {
    const member = await this.getMemberOrThrow(id);
    await this.permissionsService.requirePermission(
      currentUser,
      member.residenceId,
      'team',
      'editMember',
    );
    await this.permissionsService.requirePermission(
      currentUser,
      member.residenceId,
      'team',
      'editPermissions',
    );

    const role = dto.role ?? member.role;
    this.assertTeamRole(role);
    const permissions = mergePermissions(role, dto.permissions);

    return this.prisma.syndicTeamMember.update({
      where: { id },
      data: {
        role,
        permissions,
        user: { update: { role } },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            isActive: true,
          },
        },
      },
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateTeamMemberStatusDto,
    currentUser: AuthUser,
  ) {
    const member = await this.getMemberOrThrow(id);
    await this.permissionsService.requirePermission(
      currentUser,
      member.residenceId,
      'team',
      'editMember',
    );

    return this.prisma.syndicTeamMember.update({
      where: { id },
      data: { isActive: dto.isActive },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            isActive: true,
          },
        },
      },
    });
  }

  async remove(id: string, currentUser: AuthUser) {
    const member = await this.getMemberOrThrow(id);
    await this.permissionsService.requirePermission(
      currentUser,
      member.residenceId,
      'team',
      'deleteMember',
    );

    return this.prisma.syndicTeamMember.delete({ where: { id } });
  }

  private async getMemberOrThrow(id: string) {
    const member = await this.prisma.syndicTeamMember.findUnique({
      where: { id },
      select: { id: true, residenceId: true, role: true },
    });

    if (!member) throw new NotFoundException('Membre introuvable');
    return member;
  }

  private assertTeamRole(role: UserRole) {
    if (!TEAM_ROLES.includes(role)) {
      throw new BadRequestException('Role equipe invalide');
    }
  }

  private generateTemporaryPassword() {
    return `Easy-${Math.random().toString(36).slice(2, 8)}1`;
  }

  private getFullPermissions() {
    return getFullPermissionMap();
  }
}
