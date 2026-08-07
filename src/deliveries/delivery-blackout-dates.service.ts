import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateDeliveryBlackoutDateDto } from './dto/create-delivery-blackout-date.dto';
import { UpdateDeliveryBlackoutDateDto } from './dto/update-delivery-blackout-date.dto';
import { DeliveryBlackoutDate } from './entities/delivery-blackout-date.entity';

@Injectable()
export class DeliveryBlackoutDatesService {
  constructor(
    @InjectRepository(DeliveryBlackoutDate)
    private readonly blackoutDateRepository: Repository<DeliveryBlackoutDate>,
  ) {}

  async create(dto: CreateDeliveryBlackoutDateDto) {
    const blackoutDate = dto.blackoutDate;
    const reason = dto.reason.trim();

    const existing = await this.blackoutDateRepository.findOne({
      where: {
        blackoutDate,
      },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('Ngày không giao hàng này đã tồn tại');
      }

      existing.reason = reason;
      existing.isActive = dto.isActive ?? true;

      const restored = await this.blackoutDateRepository.save(existing);

      return this.buildResponse(restored);
    }

    const entity = this.blackoutDateRepository.create({
      blackoutDate,
      reason,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.blackoutDateRepository.save(entity);

    return this.buildResponse(saved);
  }

  async findAll() {
    const blackoutDates = await this.blackoutDateRepository.find({
      order: {
        blackoutDate: 'ASC',
      },
    });

    return blackoutDates.map((item) => this.buildResponse(item));
  }

  async findOne(id: string) {
    const blackoutDate = await this.blackoutDateRepository.findOne({
      where: {
        id,
      },
    });

    if (!blackoutDate) {
      throw new NotFoundException('Không tìm thấy ngày không giao hàng');
    }

    return this.buildResponse(blackoutDate);
  }

  async update(id: string, dto: UpdateDeliveryBlackoutDateDto) {
    const blackoutDate = await this.blackoutDateRepository.findOne({
      where: {
        id,
      },
    });

    if (!blackoutDate) {
      throw new NotFoundException('Không tìm thấy ngày không giao hàng');
    }

    const nextDate = dto.blackoutDate ?? blackoutDate.blackoutDate;

    if (nextDate !== blackoutDate.blackoutDate) {
      const duplicate = await this.blackoutDateRepository.findOne({
        where: {
          blackoutDate: nextDate,
        },
      });

      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('Ngày không giao hàng này đã tồn tại');
      }
    }

    blackoutDate.blackoutDate = nextDate;

    if (dto.reason !== undefined) {
      blackoutDate.reason = dto.reason.trim();
    }

    if (dto.isActive !== undefined) {
      blackoutDate.isActive = dto.isActive;
    }

    const saved = await this.blackoutDateRepository.save(blackoutDate);

    return this.buildResponse(saved);
  }

  async remove(id: string) {
    const blackoutDate = await this.blackoutDateRepository.findOne({
      where: {
        id,
      },
    });

    if (!blackoutDate) {
      throw new NotFoundException('Không tìm thấy ngày không giao hàng');
    }

    blackoutDate.isActive = false;

    await this.blackoutDateRepository.save(blackoutDate);

    return {
      message: 'Đã vô hiệu hóa ngày không giao hàng',
    };
  }

  private buildResponse(blackoutDate: DeliveryBlackoutDate) {
    return {
      id: blackoutDate.id,
      blackoutDate: blackoutDate.blackoutDate,
      reason: blackoutDate.reason,
      isActive: blackoutDate.isActive,
      createdAt: blackoutDate.createdAt,
      updatedAt: blackoutDate.updatedAt,
    };
  }
}
