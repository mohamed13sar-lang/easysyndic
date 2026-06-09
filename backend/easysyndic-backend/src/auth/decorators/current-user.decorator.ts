import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUserEntity } from '../entities/auth-user.entity';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUserEntity => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUserEntity }>();
    return request.user;
  },
);
