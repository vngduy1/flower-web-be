import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const roleCode = createRoleDto.roleCode.trim().toUpperCase();

    const existingRole = await this.rolesRepository.findOne({
      where: { roleCode },
    });

    if (existingRole) {
      throw new ConflictException('Mã quyền đã tồn tại');
    }

    const role = this.rolesRepository.create({
      ...createRoleDto,
      roleCode,
      roleName: createRoleDto.roleName.trim(),
    });

    return this.rolesRepository.save(role);
  }

  async findAll(): Promise<Role[]> {
    return this.rolesRepository.find({
      order: {
        id: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Không tìm thấy quyền');
    }

    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    if (updateRoleDto.roleCode) {
      const roleCode = updateRoleDto.roleCode.trim().toUpperCase();

      const duplicateRole = await this.rolesRepository.findOne({
        where: { roleCode },
      });

      if (duplicateRole && duplicateRole.id !== id) {
        throw new ConflictException('Mã quyền đã tồn tại');
      }

      role.roleCode = roleCode;
    }

    if (updateRoleDto.roleName !== undefined) {
      role.roleName = updateRoleDto.roleName.trim();
    }

    if (updateRoleDto.isActive !== undefined) {
      role.isActive = updateRoleDto.isActive;
    }

    return this.rolesRepository.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: {
        users: true,
      },
    });

    if (!role) {
      throw new NotFoundException('Không tìm thấy quyền');
    }

    if (role.users.length > 0) {
      throw new ConflictException(
        'Không thể xóa quyền đang được tài khoản sử dụng',
      );
    }

    await this.rolesRepository.remove(role);
  }
}
