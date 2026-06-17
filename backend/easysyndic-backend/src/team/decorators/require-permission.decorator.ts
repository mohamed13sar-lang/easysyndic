import { SetMetadata } from '@nestjs/common';
import { PermissionAction, PermissionModule } from '../permissions.types';

export const PERMISSION_KEY = 'syndic_permission';

export type RequiredPermission = {
  module: PermissionModule;
  action: PermissionAction;
};

export const RequirePermission = (
  module: PermissionModule,
  action: PermissionAction,
) => SetMetadata(PERMISSION_KEY, { module, action } satisfies RequiredPermission);
