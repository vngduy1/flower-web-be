import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { CreateDeliveryCapacityDto } from './dto/create-delivery-capacity.dto';
import { UpdateDeliveryCapacityDto } from './dto/update-delivery-capacity.dto';
import { DeliveryCapacity } from './entities/delivery-capacity.entity';
import { DeliveryTimeSlot } from './entities/delivery-time-slot.entity';

@Injectable()
export class DeliveryCapacitiesService {
  constructor(
    @InjectRepository(DeliveryCapacity)
    private readonly capacityRepository: Repository<DeliveryCapacity>,

    @InjectRepository(DeliveryTimeSlot)
    private readonly timeSlotRepository: Repository<DeliveryTimeSlot>,
  ) {}

  async create(dto: CreateDeliveryCapacityDto) {
    const timeSlot = await this.timeSlotRepository.findOne({
      where: {
        id: dto.timeSlotId,
      },
    });

    if (!timeSlot) {
      throw new NotFoundException('Không tìm thấy khung giờ giao hàng');
    }

    if (!timeSlot.isActive) {
      throw new ConflictException('Khung giờ giao hàng đang bị vô hiệu hóa');
    }

    const existing = await this.capacityRepository.findOne({
      where: {
        deliveryDate: dto.deliveryDate,
        timeSlotId: dto.timeSlotId,
      },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException(
          'Sức chứa của ngày và khung giờ này đã tồn tại',
        );
      }

      existing.maxOrders = dto.maxOrders;
      existing.isActive = dto.isActive ?? true;

      const restored = await this.capacityRepository.save(existing);

      return this.buildResponse(restored);
    }

    const capacity = this.capacityRepository.create({
      deliveryDate: dto.deliveryDate,
      timeSlotId: dto.timeSlotId,
      maxOrders: dto.maxOrders,
      reservedOrders: 0,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.capacityRepository.save(capacity);

    return this.findOne(saved.id);
  }

  async findAll() {
    const capacities = await this.capacityRepository.find({
      relations: {
        timeSlot: true,
      },
      order: {
        deliveryDate: 'ASC',
        timeSlot: {
          sortOrder: 'ASC',
        },
      },
    });

    return capacities.map((capacity) => this.buildResponse(capacity));
  }

  async findOne(id: string) {
    const capacity = await this.capacityRepository.findOne({
      where: {
        id,
      },
      relations: {
        timeSlot: true,
      },
    });

    if (!capacity) {
      throw new NotFoundException('Không tìm thấy cấu hình sức chứa giao hàng');
    }

    return this.buildResponse(capacity);
  }

  async update(id: string, dto: UpdateDeliveryCapacityDto) {
    const capacity = await this.capacityRepository.findOne({
      where: {
        id,
      },
      relations: {
        timeSlot: true,
      },
    });

    if (!capacity) {
      throw new NotFoundException('Không tìm thấy cấu hình sức chứa giao hàng');
    }

    const nextDeliveryDate = dto.deliveryDate ?? capacity.deliveryDate;

    const nextTimeSlotId = dto.timeSlotId ?? capacity.timeSlotId;

    if (dto.timeSlotId !== undefined) {
      const timeSlot = await this.timeSlotRepository.findOne({
        where: {
          id: dto.timeSlotId,
        },
      });

      if (!timeSlot) {
        throw new NotFoundException('Không tìm thấy khung giờ giao hàng');
      }

      if (!timeSlot.isActive) {
        throw new ConflictException('Khung giờ giao hàng đang bị vô hiệu hóa');
      }
    }

    if (
      nextDeliveryDate !== capacity.deliveryDate ||
      nextTimeSlotId !== capacity.timeSlotId
    ) {
      const duplicate = await this.capacityRepository.findOne({
        where: {
          id: Not(id),
          deliveryDate: nextDeliveryDate,
          timeSlotId: nextTimeSlotId,
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'Sức chứa của ngày và khung giờ này đã tồn tại',
        );
      }
    }

    const nextMaxOrders = dto.maxOrders ?? capacity.maxOrders;

    if (nextMaxOrders < capacity.reservedOrders) {
      throw new ConflictException(
        'Sức chứa tối đa không được nhỏ hơn số đơn đã giữ chỗ',
      );
    }

    capacity.deliveryDate = nextDeliveryDate;
    capacity.timeSlotId = nextTimeSlotId;
    capacity.maxOrders = nextMaxOrders;

    if (dto.isActive !== undefined) {
      capacity.isActive = dto.isActive;
    }

    await this.capacityRepository.save(capacity);

    return this.findOne(id);
  }

  async remove(id: string) {
    const capacity = await this.capacityRepository.findOne({
      where: {
        id,
      },
    });

    if (!capacity) {
      throw new NotFoundException('Không tìm thấy cấu hình sức chứa giao hàng');
    }

    capacity.isActive = false;

    await this.capacityRepository.save(capacity);

    return {
      message: 'Đã vô hiệu hóa sức chứa giao hàng',
    };
  }

  private buildResponse(capacity: DeliveryCapacity) {
    return {
      id: capacity.id,
      deliveryDate: capacity.deliveryDate,

      timeSlot: capacity.timeSlot
        ? {
            id: capacity.timeSlot.id,
            slotCode: capacity.timeSlot.slotCode,
            displayName: capacity.timeSlot.displayName,
            startTime: capacity.timeSlot.startTime,
            endTime: capacity.timeSlot.endTime,
          }
        : null,

      maxOrders: capacity.maxOrders,
      reservedOrders: capacity.reservedOrders,
      remainingOrders: capacity.maxOrders - capacity.reservedOrders,

      isFull: capacity.reservedOrders >= capacity.maxOrders,

      isActive: capacity.isActive,
      createdAt: capacity.createdAt,
      updatedAt: capacity.updatedAt,
    };
  }
}
