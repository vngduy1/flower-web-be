import { Injectable, NotFoundException } from '@nestjs/common';

import { DataSource, EntityManager, Repository } from 'typeorm';

import { InjectRepository } from '@nestjs/typeorm';

import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UserAddress } from './entities/user-address.entity';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(UserAddress)
    private readonly addressRepository: Repository<UserAddress>,

    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, dto: CreateAddressDto): Promise<UserAddress> {
    const addressId = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(UserAddress);

      const addressCount = await repository.count({
        where: {
          userId,
        },
      });

      /*
       * Địa chỉ đầu tiên luôn được đặt mặc định.
       */
      const shouldSetDefault = addressCount === 0 || dto.isDefault === true;

      if (shouldSetDefault) {
        await this.clearDefaultAddresses(manager, userId);
      }

      const address = repository.create({
        userId,
        label: dto.label ?? null,
        recipientName: dto.recipientName,
        recipientPhone: dto.recipientPhone,
        postalCode: dto.postalCode,
        prefecture: dto.prefecture,
        city: dto.city,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2 ?? null,
        isDefault: shouldSetDefault,
      });

      const savedAddress = await repository.save(address);

      return savedAddress.id;
    });

    return this.findOne(userId, addressId);
  }

  async findAll(userId: string): Promise<UserAddress[]> {
    return this.addressRepository.find({
      where: {
        userId,
      },
      order: {
        isDefault: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async findOne(userId: string, addressId: string): Promise<UserAddress> {
    const address = await this.addressRepository.findOne({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }

    return address;
  }

  async update(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<UserAddress> {
    const address = await this.findOne(userId, addressId);

    /*
     * Object.assign chỉ cập nhật các field
     * có trong request DTO.
     */
    Object.assign(address, {
      ...dto,

      label: dto.label !== undefined ? dto.label || null : address.label,

      addressLine2:
        dto.addressLine2 !== undefined
          ? dto.addressLine2 || null
          : address.addressLine2,
    });

    await this.addressRepository.save(address);

    return this.findOne(userId, addressId);
  }

  async setDefault(userId: string, addressId: string): Promise<UserAddress> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(UserAddress);

      const address = await repository.findOne({
        where: {
          id: addressId,
          userId,
        },
      });

      if (!address) {
        throw new NotFoundException('Không tìm thấy địa chỉ');
      }

      await this.clearDefaultAddresses(manager, userId);

      address.isDefault = true;

      await repository.save(address);
    });

    return this.findOne(userId, addressId);
  }

  async remove(
    userId: string,
    addressId: string,
  ): Promise<{
    message: string;
  }> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(UserAddress);

      const address = await repository.findOne({
        where: {
          id: addressId,
          userId,
        },
      });

      if (!address) {
        throw new NotFoundException('Không tìm thấy địa chỉ');
      }

      const wasDefault = address.isDefault;

      await repository.softRemove(address);

      /*
       * Nếu vừa xóa địa chỉ mặc định,
       * chọn địa chỉ còn lại mới nhất
       * làm mặc định.
       */
      if (wasDefault) {
        const replacementAddress = await repository.findOne({
          where: {
            userId,
          },
          order: {
            createdAt: 'DESC',
          },
        });

        if (replacementAddress) {
          replacementAddress.isDefault = true;

          await repository.save(replacementAddress);
        }
      }
    });

    return {
      message: 'Xóa địa chỉ thành công',
    };
  }

  private async clearDefaultAddresses(
    manager: EntityManager,
    userId: string,
  ): Promise<void> {
    await manager
      .getRepository(UserAddress)
      .createQueryBuilder()
      .update(UserAddress)
      .set({
        isDefault: false,
      })
      .where('user_id = :userId', {
        userId,
      })
      .andWhere('is_default = :isDefault', {
        isDefault: true,
      })
      .andWhere('deleted_at IS NULL')
      .execute();
  }
}
