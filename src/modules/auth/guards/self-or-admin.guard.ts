import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SELF_PARAM_KEY } from '../decorators/self.decorator.js';
import { UserRole } from '../../users/entities/user.entity.js';

@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const paramName =
      this.reflector.getAllAndOverride<string>(SELF_PARAM_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? 'id';

    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException();

    if (user.role === UserRole.ADMIN) return true;

    const targetId = Number(req.params[paramName]);
    if (!Number.isFinite(targetId) || user.id !== targetId) {
      throw new ForbiddenException('You can only access your own resource');
    }
    return true;
  }
}
