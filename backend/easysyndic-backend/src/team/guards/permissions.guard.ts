import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import {
  PERMISSION_KEY,
  RequiredPermission,
} from '../decorators/require-permission.decorator';
import { TeamPermissionsService } from '../team-permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: TeamPermissionsService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) return true;

    const request = context.switchToHttp().getRequest<{
      user?: { id: string; role: UserRole };
      params?: Record<string, string | undefined>;
      query?: Record<string, string | undefined>;
      body?: { residenceId?: string };
    }>();

    if (!request.user) {
      throw new ForbiddenException('Unauthorized');
    }

    const residenceId =
      request.params?.residenceId ??
      request.params?.id ??
      request.query?.residenceId ??
      request.body?.residenceId;

    if (!residenceId) {
      throw new ForbiddenException('Residence context is required');
    }

    await this.permissionsService.requirePermission(
      request.user,
      residenceId,
      required.module,
      required.action,
    );

    (
      request.user as {
        permissionChecked?: RequiredPermission & { residenceId: string };
      }
    ).permissionChecked = { ...required, residenceId };

    return true;
  }
}
