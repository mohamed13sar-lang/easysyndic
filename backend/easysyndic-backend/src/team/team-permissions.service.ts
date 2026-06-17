import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  LEGACY_PERMISSION_ALIASES,
  PermissionAction,
  PermissionMap,
  PermissionModule,
} from './permissions.types';

type AuthUser = { id: string; role: UserRole };

@Injectable()
export class TeamPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async hasPermission(
    userId: string,
    residenceId: string,
    module: PermissionModule,
    action: PermissionAction,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) return false;
    if (user.role === UserRole.SUPER_ADMIN) return true;

    const residence = await this.prisma.residence.findUnique({
      where: { id: residenceId },
      select: { id: true, syndicId: true },
    });

    if (!residence) return false;
    if (user.role === UserRole.SYNDIC && residence.syndicId === user.id) {
      return true;
    }

    const membership = await this.prisma.syndicTeamMember.findFirst({
      where: { userId, residenceId, isActive: true },
      select: { permissions: true },
    });

    if (!membership) return false;
    const permissions = membership.permissions as PermissionMap;
    if (permissions?.[module]?.[action]) return true;

    const aliases = LEGACY_PERMISSION_ALIASES[`${module}.${action}`] ?? [];
    return aliases.some((permissionKey) => {
      const [aliasModule, aliasAction] = permissionKey.split('.');
      return Boolean(permissions?.[aliasModule]?.[aliasAction]);
    });
  }

  async requirePermission(
    user: AuthUser,
    residenceId: string,
    module: PermissionModule,
    action: PermissionAction,
  ) {
    if (!residenceId) {
      throw new ForbiddenException('Residence context is required');
    }

    const allowed = await this.hasPermission(user.id, residenceId, module, action);
    if (!allowed) {
      throw new ForbiddenException('Permission insuffisante');
    }
  }

  async assertResidenceOwnerOrTeamManager(user: AuthUser, residenceId: string) {
    const residence = await this.prisma.residence.findUnique({
      where: { id: residenceId },
      select: { id: true, syndicId: true },
    });

    if (!residence) {
      throw new NotFoundException('Residence introuvable');
    }

    if (user.role === UserRole.SUPER_ADMIN) return residence;
    if (user.role === UserRole.SYNDIC && residence.syndicId === user.id) {
      return residence;
    }

    await this.requirePermission(user, residenceId, 'team', 'editPermissions');
    return residence;
  }

  async getAccessibleResidenceIds(user: AuthUser) {
    if (user.role === UserRole.SUPER_ADMIN) return null;

    const ownerResidences = await this.prisma.residence.findMany({
      where: { syndicId: user.id },
      select: { id: true },
    });
    const teamResidences = await this.prisma.syndicTeamMember.findMany({
      where: { userId: user.id, isActive: true },
      select: { residenceId: true },
    });

    return Array.from(
      new Set([
        ...ownerResidences.map((residence) => residence.id),
        ...teamResidences.map((membership) => membership.residenceId),
      ]),
    );
  }
}
