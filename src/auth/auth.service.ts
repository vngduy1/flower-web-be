import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { Repository } from 'typeorm';

import { UsersService } from '../users/users.service';
import { UserStatus } from '../users/enums/user-status.enum';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { EmailsService } from '../emails/emails.service';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { RoleCode } from './enums/role-code.enum';

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
  private static readonly VERIFICATION_CODE_EXPIRES_MINUTES = 10;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,

    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailsService: EmailsService,
  ) {}

  /**
   * Đăng ký tài khoản.
   *
   * Tài khoản được tạo ở trạng thái ACTIVE nhưng chưa thể đăng nhập
   * cho đến khi địa chỉ email được xác minh.
   */
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

    const verificationCode = this.generateVerificationCode();

    const verificationCodeHash = await bcrypt.hash(verificationCode, 12);

    const verificationExpiresAt = this.createVerificationExpiration();

    const user = this.usersRepository.create({
      roleId: customerRole.id,
      email: normalizedEmail,
      passwordHash,
      fullName: dto.fullName.trim(),
      phone: dto.phone?.trim() || null,

      status: UserStatus.ACTIVE,

      emailVerificationCode: verificationCodeHash,
      emailVerificationExpiresAt: verificationExpiresAt,
      emailVerifiedAt: null,

      deletedAt: null,
    });

    const savedUser = await this.usersRepository.save(user);

    const emailSent = await this.emailsService.sendEmailVerificationCode({
      to: savedUser.email,
      fullName: savedUser.fullName,
      code: verificationCode,
      expiresInMinutes: AuthService.VERIFICATION_CODE_EXPIRES_MINUTES,
    });

    return {
      id: savedUser.id,
      email: savedUser.email,
      fullName: savedUser.fullName,
      phone: savedUser.phone,
      status: savedUser.status,

      emailVerified: false,
      verificationEmailSent: emailSent,

      role: {
        id: customerRole.id,
        roleCode: customerRole.roleCode,
        roleName: customerRole.roleName,
      },

      createdAt: savedUser.createdAt,
    };
  }

  /**
   * Xác minh email bằng mã OTP.
   */
  async verifyEmail(dto: VerifyEmailDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.emailVerificationCode')
      .where('LOWER(user.email) = LOWER(:email)', {
        email: normalizedEmail,
      })
      .andWhere('user.deletedAt IS NULL')
      .getOne();

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    if (user.emailVerifiedAt) {
      throw new ConflictException('Địa chỉ email đã được xác minh');
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpiresAt) {
      throw new BadRequestException('Không có mã xác minh hợp lệ');
    }

    const now = new Date();

    if (user.emailVerificationExpiresAt.getTime() <= now.getTime()) {
      throw new BadRequestException(
        'Mã xác minh đã hết hạn. Vui lòng yêu cầu mã mới',
      );
    }

    const verificationCodeMatched = await bcrypt.compare(
      dto.code,
      user.emailVerificationCode,
    );

    if (!verificationCodeMatched) {
      throw new BadRequestException('Mã xác minh không chính xác');
    }

    user.emailVerifiedAt = now;
    user.emailVerificationCode = null;
    user.emailVerificationExpiresAt = null;

    await this.usersRepository.save(user);

    /*
     * Sau khi xác minh thành công mới gửi email chào mừng.
     * Lỗi gửi email không ảnh hưởng kết quả xác minh.
     */
    void this.emailsService
      .sendRegistrationEmail({
        to: user.email,
        fullName: user.fullName,
      })
      .catch(() => {
        // EmailsService đã xử lý lỗi SMTP.
      });

    return {
      message: 'Xác minh địa chỉ email thành công',
      email: user.email,
      emailVerified: true,
    };
  }

  /**
   * Gửi lại mã xác minh email.
   */
  async resendVerification(dto: ResendVerificationDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.usersRepository.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    if (user.emailVerifiedAt) {
      throw new ConflictException('Địa chỉ email đã được xác minh');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản hiện không hoạt động');
    }

    const verificationCode = this.generateVerificationCode();

    user.emailVerificationCode = await bcrypt.hash(verificationCode, 12);

    user.emailVerificationExpiresAt = this.createVerificationExpiration();

    await this.usersRepository.save(user);

    const emailSent = await this.emailsService.sendEmailVerificationCode({
      to: user.email,
      fullName: user.fullName,
      code: verificationCode,
      expiresInMinutes: AuthService.VERIFICATION_CODE_EXPIRES_MINUTES,
    });

    return {
      message: emailSent
        ? 'Mã xác minh mới đã được gửi'
        : 'Không thể gửi email xác minh. Vui lòng thử lại sau',
      email: user.email,
      verificationEmailSent: emailSent,
    };
  }

  /**
   * Đăng nhập.
   */
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

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Vui lòng xác minh địa chỉ email trước khi đăng nhập',
      );
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

  /**
   * Sinh mã xác minh gồm 6 chữ số.
   */
  private generateVerificationCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  /**
   * Thời điểm mã xác minh hết hạn.
   */
  private createVerificationExpiration(): Date {
    return new Date(
      Date.now() + AuthService.VERIFICATION_CODE_EXPIRES_MINUTES * 60 * 1000,
    );
  }
}
