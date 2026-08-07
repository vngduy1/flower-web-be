import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { UserStatus } from '../../users/enums/user-status.enum';
import { RoleCode } from '../enums/role-code.enum';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findOne(payload.sub);

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản hiện không hoạt động');
    }

    if (!user.role || !user.role.isActive) {
      throw new UnauthorizedException(
        'Quyền của tài khoản hiện không hoạt động',
      );
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      status: user.status,
      roleCode: user.role.roleCode as RoleCode,
      roleName: user.role.roleName,
    };
  }
}
