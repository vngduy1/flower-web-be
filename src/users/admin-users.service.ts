import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../roles/entities/role.entity';

import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { User } from './entities/user.entity';
import { UserStatus } from './enums/user-status.enum';

@Injectable()
export class AdminUsersService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(query: AdminUserQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.deletedAt IS NULL')
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.keyword?.trim()) {
      qb.andWhere(
        `(
          user.email LIKE :keyword
          OR user.fullName LIKE :keyword
          OR user.phone LIKE :keyword
        )`,
        {
          keyword: `%${query.keyword.trim()}%`,
        },
      );
    }

    if (query.roleCode) {
      qb.andWhere('role.roleCode = :roleCode', {
        roleCode: query.roleCode,
      });
    }

    if (query.status) {
      qb.andWhere('user.status = :status', {
        status: query.status,
      });
    }

    const [users, total] = await qb.getManyAndCount();

    return {
      items: users.map((user) => this.buildResponse(user)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string) {
    const user = await this.dataSource.getRepository(User).findOne({
      where: {
        id: userId,
        deletedAt: IsNull(),
      },
      relations: {
        role: true,
        orders: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const totalSpent = user.orders
      .filter(
        (order) =>
          order.paymentStatus === 'PAID' && order.status !== 'CANCELLED',
      )
      .reduce((sum, order) => sum + Number(order.totalAmount), 0);

    return {
      ...this.buildResponse(user),
      orderSummary: {
        totalOrders: user.orders.length,
        totalSpent,
      },
    };
  }

  async create(dto: CreateUserDto) {
    const userRepository = this.dataSource.getRepository(User);

    const roleRepository = this.dataSource.getRepository(Role);

    const normalizedEmail = dto.email.trim().toLowerCase();

    const existingUser = await userRepository.findOne({
      where: {
        email: normalizedEmail,
      },
      withDeleted: true,
    });

    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const role = await roleRepository.findOne({
      where: {
        roleCode: dto.roleCode,
        isActive: true,
      },
    });

    if (!role) {
      throw new NotFoundException('Không tìm thấy quyền phù hợp');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = userRepository.create({
      roleId: role.id,
      email: normalizedEmail,
      passwordHash,
      fullName: dto.fullName.trim(),
      phone: dto.phone?.trim() || null,
      status: dto.status ?? UserStatus.ACTIVE,
    });

    const savedUser = await userRepository.save(user);

    savedUser.role = role;

    return this.buildResponse(savedUser);
  }

  async updateStatus(
    currentAdminId: string,
    userId: string,
    dto: UpdateUserStatusDto,
  ) {
    if (currentAdminId === userId) {
      throw new ConflictException(
        'Không thể thay đổi trạng thái tài khoản của chính mình',
      );
    }

    const repo = this.dataSource.getRepository(User);

    const user = await repo.findOne({
      where: {
        id: userId,
        deletedAt: IsNull(),
      },
      relations: {
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (user.status === dto.status) {
      throw new ConflictException('Người dùng đã ở trạng thái được yêu cầu');
    }

    user.status = dto.status;

    await repo.save(user);

    return this.buildResponse(user);
  }

  async updateRole(
    currentAdminId: string,
    userId: string,
    dto: UpdateUserRoleDto,
  ) {
    if (currentAdminId === userId) {
      throw new ConflictException('Không thể thay đổi quyền của chính mình');
    }

    const userRepo = this.dataSource.getRepository(User);

    const roleRepo = this.dataSource.getRepository(Role);

    const user = await userRepo.findOne({
      where: {
        id: userId,
        deletedAt: IsNull(),
      },
      relations: {
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const role = await roleRepo.findOne({
      where: {
        roleCode: dto.roleCode,
        isActive: true,
      },
    });

    if (!role) {
      throw new NotFoundException('Không tìm thấy quyền phù hợp');
    }

    if (user.roleId === role.id) {
      throw new ConflictException('Người dùng đã có quyền được yêu cầu');
    }

    user.roleId = role.id;
    user.role = role;

    await userRepo.save(user);

    return this.buildResponse(user);
  }

  async remove(currentAdminId: string, userId: string) {
    if (currentAdminId === userId) {
      throw new ConflictException('Không thể xóa tài khoản của chính mình');
    }

    const repo = this.dataSource.getRepository(User);

    const user = await repo.findOne({
      where: {
        id: userId,
        deletedAt: IsNull(),
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    await repo.softRemove(user);

    return {
      message: 'Đã xóa người dùng',
    };
  }

  private buildResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      status: user.status,

      role: user.role
        ? {
            id: user.role.id,
            roleCode: user.role.roleCode,
            roleName: user.role.roleName,
          }
        : null,

      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async restore(currentAdminId: string, userId: string) {
    if (currentAdminId === userId) {
      throw new ConflictException(
        'Không thể khôi phục tài khoản của chính mình',
      );
    }

    const userRepository = this.dataSource.getRepository(User);

    const user = await userRepository.findOne({
      where: {
        id: userId,
      },
      withDeleted: true,
      relations: {
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (user.deletedAt === null) {
      throw new ConflictException('Người dùng chưa bị xóa');
    }

    await userRepository.restore(user.id);

    const restoredUser = await userRepository.findOne({
      where: {
        id: userId,
      },
      relations: {
        role: true,
      },
    });

    if (!restoredUser) {
      throw new NotFoundException(
        'Không thể lấy thông tin người dùng sau khi khôi phục',
      );
    }

    return {
      message: 'Đã khôi phục người dùng',
      user: this.buildResponse(restoredUser),
    };
  }
}
