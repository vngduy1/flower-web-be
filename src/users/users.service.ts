import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async findByEmailForAuth(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.role', 'role')
      .where('LOWER(user.email) = LOWER(:email)', {
        email: email.trim(),
      })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const email = createUserDto.email.trim().toLowerCase();

    const existingUser = await this.usersRepository.findOne({
      where: { email },
      withDeleted: true,
    });

    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const role = await this.rolesRepository.findOne({
      where: {
        roleCode: createUserDto.roleCode,
        isActive: true,
      },
    });

    if (!role) {
      throw new NotFoundException(
        'Không tìm thấy quyền hoặc quyền đang bị vô hiệu hóa',
      );
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 12);

    const user = this.usersRepository.create({
      roleId: role.id,
      email,
      passwordHash,
      fullName: createUserDto.fullName.trim(),
      phone: createUserDto.phone?.trim() ?? null,
      status: createUserDto.status,
    });

    const savedUser = await this.usersRepository.save(user);

    return this.findOne(savedUser.id);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: {
        role: true,
      },
      order: {
        id: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: {
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email !== undefined) {
      const email = updateUserDto.email.trim().toLowerCase();

      const duplicateUser = await this.usersRepository.findOne({
        where: { email },
        withDeleted: true,
      });

      if (duplicateUser && duplicateUser.id !== id) {
        throw new ConflictException('Email đã được sử dụng');
      }

      user.email = email;
    }

    if (updateUserDto.roleId !== undefined) {
      const role = await this.rolesRepository.findOne({
        where: {
          id: updateUserDto.roleId,
          isActive: true,
        },
      });

      if (!role) {
        throw new NotFoundException(
          'Không tìm thấy quyền hoặc quyền đang bị vô hiệu hóa',
        );
      }

      user.roleId = role.id;
    }

    if (updateUserDto.password !== undefined) {
      user.passwordHash = await bcrypt.hash(updateUserDto.password, 12);
    }

    if (updateUserDto.fullName !== undefined) {
      user.fullName = updateUserDto.fullName.trim();
    }

    if (updateUserDto.phone !== undefined) {
      user.phone = updateUserDto.phone.trim() || null;
    }

    if (updateUserDto.status !== undefined) {
      user.status = updateUserDto.status;
    }

    await this.usersRepository.save(user);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);

    await this.usersRepository.softRemove(user);
  }

  async restore(id: string): Promise<User> {
    const result = await this.usersRepository.restore(id);

    if (!result.affected) {
      throw new NotFoundException('Không tìm thấy tài khoản đã xóa');
    }

    return this.findOne(id);
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.findOne(userId);

    if (updateProfileDto.fullName !== undefined) {
      user.fullName = updateProfileDto.fullName.trim();
    }

    if (updateProfileDto.phone !== undefined) {
      user.phone = updateProfileDto.phone.trim() || null;
    }

    await this.usersRepository.save(user);

    return this.findOne(userId);
  }
}
