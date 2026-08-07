import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { CreateDeliveryTimeSlotDto } from './dto/create-delivery-time-slot.dto';
import { UpdateDeliveryTimeSlotDto } from './dto/update-delivery-time-slot.dto';
import { DeliveryTimeSlot } from './entities/delivery-time-slot.entity';

@Injectable()
export class DeliveryTimeSlotsService {
  constructor(
    @InjectRepository(DeliveryTimeSlot)
    private readonly deliveryTimeSlotRepository: Repository<DeliveryTimeSlot>,
  ) {}

  async create(dto: CreateDeliveryTimeSlotDto) {
    const slotCode = dto.slotCode.trim().toUpperCase();
    const displayName = dto.displayName.trim();

    this.validateTimeRange(dto.startTime, dto.endTime);

    const existing = await this.deliveryTimeSlotRepository.findOne({
      where: {
        slotCode,
      },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('Mã khung giờ đã tồn tại');
      }

      this.validateTimeRange(dto.startTime, dto.endTime);

      await this.validateOverlappingTime(
        dto.startTime,
        dto.endTime,
        existing.id,
      );

      existing.displayName = displayName;
      existing.startTime = this.normalizeTime(dto.startTime);
      existing.endTime = this.normalizeTime(dto.endTime);
      existing.defaultCapacity = dto.defaultCapacity;
      existing.sortOrder = dto.sortOrder ?? existing.sortOrder;
      existing.isActive = dto.isActive ?? true;

      const restored = await this.deliveryTimeSlotRepository.save(existing);

      return this.buildResponse(restored);
    }

    await this.validateOverlappingTime(dto.startTime, dto.endTime);

    const timeSlot = this.deliveryTimeSlotRepository.create({
      slotCode,
      displayName,
      startTime: this.normalizeTime(dto.startTime),
      endTime: this.normalizeTime(dto.endTime),
      defaultCapacity: dto.defaultCapacity,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.deliveryTimeSlotRepository.save(timeSlot);

    return this.buildResponse(saved);
  }

  async findAll() {
    const timeSlots = await this.deliveryTimeSlotRepository.find({
      order: {
        sortOrder: 'ASC',
        startTime: 'ASC',
      },
    });

    return timeSlots.map((timeSlot) => this.buildResponse(timeSlot));
  }

  async findOne(id: string) {
    const timeSlot = await this.deliveryTimeSlotRepository.findOne({
      where: {
        id,
      },
    });

    if (!timeSlot) {
      throw new NotFoundException('Không tìm thấy khung giờ giao hàng');
    }

    return this.buildResponse(timeSlot);
  }

  async update(id: string, dto: UpdateDeliveryTimeSlotDto) {
    const timeSlot = await this.deliveryTimeSlotRepository.findOne({
      where: {
        id,
      },
    });

    if (!timeSlot) {
      throw new NotFoundException('Không tìm thấy khung giờ giao hàng');
    }

    const slotCode = dto.slotCode?.trim().toUpperCase() ?? timeSlot.slotCode;

    if (slotCode !== timeSlot.slotCode) {
      const duplicate = await this.deliveryTimeSlotRepository.findOne({
        where: {
          slotCode,
          id: Not(id),
        },
      });

      if (duplicate) {
        throw new ConflictException('Mã khung giờ đã tồn tại');
      }
    }

    const startTime = dto.startTime ?? timeSlot.startTime;

    const endTime = dto.endTime ?? timeSlot.endTime;

    this.validateTimeRange(startTime, endTime);

    if (startTime !== timeSlot.startTime || endTime !== timeSlot.endTime) {
      await this.validateOverlappingTime(startTime, endTime, id);
    }

    timeSlot.slotCode = slotCode;

    if (dto.displayName !== undefined) {
      timeSlot.displayName = dto.displayName.trim();
    }

    timeSlot.startTime = this.normalizeTime(startTime);
    timeSlot.endTime = this.normalizeTime(endTime);

    if (dto.defaultCapacity !== undefined) {
      timeSlot.defaultCapacity = dto.defaultCapacity;
    }

    if (dto.sortOrder !== undefined) {
      timeSlot.sortOrder = dto.sortOrder;
    }

    if (dto.isActive !== undefined) {
      timeSlot.isActive = dto.isActive;
    }

    const saved = await this.deliveryTimeSlotRepository.save(timeSlot);

    return this.buildResponse(saved);
  }

  async remove(id: string) {
    const timeSlot = await this.deliveryTimeSlotRepository.findOne({
      where: {
        id,
      },
    });

    if (!timeSlot) {
      throw new NotFoundException('Không tìm thấy khung giờ giao hàng');
    }

    timeSlot.isActive = false;

    await this.deliveryTimeSlotRepository.save(timeSlot);

    return {
      message: 'Đã vô hiệu hóa khung giờ giao hàng',
    };
  }

  private validateTimeRange(startTime: string, endTime: string): void {
    const normalizedStart = this.normalizeTime(startTime);
    const normalizedEnd = this.normalizeTime(endTime);

    if (normalizedStart >= normalizedEnd) {
      throw new ConflictException(
        'Thời gian kết thúc phải lớn hơn thời gian bắt đầu',
      );
    }
  }

  private async validateOverlappingTime(
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<void> {
    const normalizedStart = this.normalizeTime(startTime);
    const normalizedEnd = this.normalizeTime(endTime);

    const queryBuilder = this.deliveryTimeSlotRepository
      .createQueryBuilder('timeSlot')
      .where('timeSlot.isActive = :isActive', {
        isActive: true,
      })
      .andWhere(
        `timeSlot.startTime < :endTime
           AND timeSlot.endTime > :startTime`,
        {
          startTime: normalizedStart,
          endTime: normalizedEnd,
        },
      );

    if (excludeId) {
      queryBuilder.andWhere('timeSlot.id != :excludeId', {
        excludeId,
      });
    }

    const overlapping = await queryBuilder.getOne();

    if (overlapping) {
      throw new ConflictException(
        `Khung giờ bị trùng với ${overlapping.displayName}`,
      );
    }
  }

  private normalizeTime(time: string): string {
    return time.length === 5 ? `${time}:00` : time;
  }

  private buildResponse(timeSlot: DeliveryTimeSlot) {
    return {
      id: timeSlot.id,
      slotCode: timeSlot.slotCode,
      displayName: timeSlot.displayName,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
      defaultCapacity: timeSlot.defaultCapacity,
      sortOrder: timeSlot.sortOrder,
      isActive: timeSlot.isActive,
      createdAt: timeSlot.createdAt,
      updatedAt: timeSlot.updatedAt,
    };
  }
}
