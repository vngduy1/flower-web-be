import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { IsNull, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { UserStatus } from '../users/enums/user-status.enum';
import { LoginDto } from './dto/login.dto';
import { RoleCode } from './enums/role-code.enum';
import { RegisterDto } from './dto/register.dto';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { EmailsService } from '../emails/emails.service';

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    roleCode: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,

    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailsService: EmailsService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existingUser = await this.usersRepository.findOne({
      where: {
        email: normalizedEmail,
      },
      withDeleted: true,
    });

    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const customerRole = await this.rolesRepository.findOne({
      where: {
        roleCode: RoleCode.CUSTOMER,
        isActive: true,
      },
    });

    if (!customerRole) {
      throw new NotFoundException('Không tìm thấy quyền CUSTOMER');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const fullName = dto.fullName.trim();

    const user = this.usersRepository.create({
      roleId: customerRole.id,
      email: normalizedEmail,
      passwordHash,
      fullName,
      phone: dto.phone?.trim() || null,
      status: UserStatus.ACTIVE,
      deletedAt: null,
    });

    const savedUser = await this.usersRepository.save(user);

    /*
     * Không await bắt buộc cho nghiệp vụ đăng ký.
     * EmailsService đã tự catch lỗi SMTP và trả boolean.
     */
    void this.emailsService
      .sendRegistrationEmail({
        to: savedUser.email,
        fullName: savedUser.fullName,
      })
      .catch(() => {
        /*
         * Bình thường sẽ không chạy vì EmailsService
         * đã xử lý lỗi, nhưng giữ thêm để tránh
         * unhandled promise rejection.
         */
      });

    return {
      id: savedUser.id,
      email: savedUser.email,
      fullName: savedUser.fullName,
      phone: savedUser.phone,
      status: savedUser.status,

      role: {
        id: customerRole.id,
        roleCode: customerRole.roleCode,
        roleName: customerRole.roleName,
      },

      createdAt: savedUser.createdAt,
    };
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const email = loginDto.email.trim().toLowerCase();

    const user = await this.usersService.findByEmailForAuth(email);

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản hiện không hoạt động');
    }

    if (!user.role || !user.role.isActive) {
      throw new UnauthorizedException(
        'Quyền của tài khoản hiện không hoạt động',
      );
    }

    const passwordMatched = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatched) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      roleCode: user.role.roleCode,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '1h',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roleCode: user.role.roleCode,
      },
    };
  }
}
