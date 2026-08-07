import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleCode } from '../enums/role-code.enum';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleCode[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Không tìm thấy thông tin người dùng');
    }

    const hasPermission = requiredRoles.includes(user.roleCode);

    if (!hasPermission) {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện chức năng này',
      );
    }

    return true;
  }
}
