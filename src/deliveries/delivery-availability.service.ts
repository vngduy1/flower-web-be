import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, MoreThanOrEqual, Repository } from 'typeorm';

import { DeliveryArea } from './entities/delivery-area.entity';
import { DeliveryBlackoutDate } from './entities/delivery-blackout-date.entity';
import { DeliveryCapacity } from './entities/delivery-capacity.entity';
import { DeliveryTimeSlot } from './entities/delivery-time-slot.entity';
import { DeliveryAreasService } from './delivery-areas.service';

@Injectable()
export class DeliveryAvailabilityService {
  constructor(
    @InjectRepository(DeliveryArea)
    private readonly deliveryAreaRepository: Repository<DeliveryArea>,

    @InjectRepository(DeliveryBlackoutDate)
    private readonly blackoutDateRepository: Repository<DeliveryBlackoutDate>,

    @InjectRepository(DeliveryCapacity)
    private readonly capacityRepository: Repository<DeliveryCapacity>,

    @InjectRepository(DeliveryTimeSlot)
    private readonly timeSlotRepository: Repository<DeliveryTimeSlot>,

    private readonly deliveryAreasService: DeliveryAreasService,
  ) {}

  /**
   * Lấy danh sách khu vực đang hỗ trợ giao hàng.
   */
  async getActiveAreas() {
    const areas = await this.deliveryAreaRepository.find({
      where: {
        isActive: true,
      },
      order: {
        prefecture: 'ASC',
        city: 'ASC',
      },
    });

    return areas.map((area) => this.buildAreaResponse(area));
  }

  /**
   * Lấy danh sách ngày còn khả năng giao hàng.
   *
   * Điều kiện:
   * - Không phải ngày trong quá khứ
   * - Không phải blackout date
   * - Capacity đang hoạt động
   * - Time slot đang hoạt động
   * - Capacity vẫn còn chỗ
   */
  async getAvailableDates() {
    const today = this.getTodayInJapan();

    const capacities = await this.capacityRepository.find({
      where: {
        deliveryDate: MoreThanOrEqual(today),
        isActive: true,
      },
      relations: {
        timeSlot: true,
      },
      order: {
        deliveryDate: 'ASC',
      },
    });

    const blackoutDates = await this.blackoutDateRepository.find({
      where: {
        isActive: true,
      },
    });

    const blackoutDateSet = new Set(
      blackoutDates.map((item) => item.blackoutDate),
    );

    const availableDateSet = new Set<string>();

    for (const capacity of capacities) {
      if (!capacity.timeSlot) {
        continue;
      }

      if (!capacity.timeSlot.isActive) {
        continue;
      }

      if (blackoutDateSet.has(capacity.deliveryDate)) {
        continue;
      }

      if (capacity.reservedOrders >= capacity.maxOrders) {
        continue;
      }

      availableDateSet.add(capacity.deliveryDate);
    }

    return Array.from(availableDateSet)
      .sort()
      .map((date) => ({
        date,
        available: true,
      }));
  }

  /**
   * Lấy các khung giờ còn chỗ của một ngày.
   */
  async getAvailableTimeSlots(date: string) {
    this.validateDateParameter(date);

    const today = this.getTodayInJapan();

    if (date < today) {
      throw new BadRequestException(
        'Không thể chọn ngày giao hàng trong quá khứ',
      );
    }

    const blackoutDate = await this.blackoutDateRepository.findOne({
      where: {
        blackoutDate: date,
        isActive: true,
      },
    });

    if (blackoutDate) {
      return [];
    }

    const capacities = await this.capacityRepository.find({
      where: {
        deliveryDate: date,
        isActive: true,
      },
      relations: {
        timeSlot: true,
      },
    });

    return capacities
      .filter((capacity) => {
        if (!capacity.timeSlot) {
          return false;
        }

        if (!capacity.timeSlot.isActive) {
          return false;
        }

        return capacity.reservedOrders < capacity.maxOrders;
      })
      .sort((a, b) => a.timeSlot.sortOrder - b.timeSlot.sortOrder)
      .map((capacity) => this.buildTimeSlotResponse(capacity));
  }

  /**
   * Lấy phí giao hàng theo địa chỉ.
   *
   * Ví dụ:
   * prefecture = 神奈川県
   * city       = 川崎市幸区
   *
   * delivery_areas:
   * city       = 川崎市
   * area_name  = 幸区
   */
  async getDeliveryFee(prefecture: string, city: string) {
    const normalizedPrefecture = prefecture?.trim();
    const normalizedCity = city?.trim();

    if (!normalizedPrefecture) {
      throw new BadRequestException('prefecture là bắt buộc');
    }

    if (!normalizedCity) {
      throw new BadRequestException('city là bắt buộc');
    }

    const area = await this.deliveryAreasService.findByAddress(
      normalizedPrefecture,
      normalizedCity,
    );

    if (!area) {
      return {
        supported: false,
        prefecture: normalizedPrefecture,
        city: normalizedCity,
        deliveryFee: null,
      };
    }

    return {
      supported: true,
      deliveryAreaId: area.id,
      prefecture: area.prefecture,
      city: area.city,
      areaName: area.areaName,
      deliveryFee: area.deliveryFee,
    };
  }

  /**
   * Kiểm tra toàn bộ lựa chọn giao hàng trước khi tạo Order.
   *
   * Method này sẽ dùng từ OrdersService.
   */
  async validateDeliverySelection(
    manager: EntityManager,
    prefecture: string,
    city: string,
    deliveryDate: string,
    timeSlotId: string,
  ) {
    this.validateDateParameter(deliveryDate);

    const today = this.getTodayInJapan();

    if (deliveryDate < today) {
      throw new ConflictException(
        'Không thể chọn ngày giao hàng trong quá khứ',
      );
    }

    const areaRepository = manager.getRepository(DeliveryArea);

    const blackoutRepository = manager.getRepository(DeliveryBlackoutDate);

    const timeSlotRepository = manager.getRepository(DeliveryTimeSlot);

    const capacityRepository = manager.getRepository(DeliveryCapacity);

    const normalizedPrefecture = prefecture.trim();
    const normalizedCity = city.trim();

    const areas = await areaRepository.find({
      where: {
        prefecture: normalizedPrefecture,
        isActive: true,
      },
    });

    const area = areas
      .filter((candidate) => {
        const areaCity = candidate.city.trim();
        const areaName = candidate.areaName?.trim() ?? '';

        // Ví dụ:
        // 川崎市 + 幸区 = 川崎市幸区
        const fullAreaName = `${areaCity}${areaName}`;

        return normalizedCity === fullAreaName || normalizedCity === areaCity;
      })
      .sort((a, b) => {
        const aLength = a.city.length + (a.areaName?.length ?? 0);

        const bLength = b.city.length + (b.areaName?.length ?? 0);

        return bLength - aLength;
      })[0];

    if (!area) {
      throw new ConflictException(
        '選択されたお届け先は、現在配送対象エリア外です。',
      );
    }

    const blackoutDate = await blackoutRepository.findOne({
      where: {
        blackoutDate: deliveryDate,
        isActive: true,
      },
    });

    if (blackoutDate) {
      throw new ConflictException('Ngày được chọn là ngày không giao hàng');
    }

    const timeSlot = await timeSlotRepository.findOne({
      where: {
        id: timeSlotId,
        isActive: true,
      },
    });

    if (!timeSlot) {
      throw new ConflictException(
        'Khung giờ giao hàng không tồn tại hoặc đã bị vô hiệu hóa',
      );
    }

    const capacity = await capacityRepository.findOne({
      where: {
        deliveryDate,
        timeSlotId,
        isActive: true,
      },
      relations: {
        timeSlot: true,
      },
      lock: {
        mode: 'pessimistic_write',
      },
    });

    if (!capacity) {
      throw new ConflictException(
        'Ngày và khung giờ này chưa được cấu hình giao hàng',
      );
    }

    if (capacity.reservedOrders >= capacity.maxOrders) {
      throw new ConflictException('Khung giờ giao hàng đã đầy');
    }

    return {
      area,
      timeSlot,
      capacity,
      deliveryFee: Number(area.deliveryFee),
    };
  }

  /**
   * Giữ một chỗ giao hàng khi tạo Order.
   *
   * Phải gọi trong transaction.
   */
  async reserveCapacity(
    manager: EntityManager,
    deliveryDate: string,
    timeSlotId: string,
  ): Promise<DeliveryCapacity> {
    const capacityRepository = manager.getRepository(DeliveryCapacity);

    const capacity = await capacityRepository.findOne({
      where: {
        deliveryDate,
        timeSlotId,
        isActive: true,
      },
      lock: {
        mode: 'pessimistic_write',
      },
    });

    if (!capacity) {
      throw new ConflictException('Không tìm thấy sức chứa giao hàng phù hợp');
    }

    if (capacity.reservedOrders >= capacity.maxOrders) {
      throw new ConflictException('Khung giờ giao hàng đã đầy');
    }

    capacity.reservedOrders += 1;

    return capacityRepository.save(capacity);
  }

  /**
   * Giải phóng một chỗ khi Order bị hủy.
   *
   * Phải gọi trong transaction.
   */
  async releaseCapacity(
    manager: EntityManager,
    deliveryDate: string,
    timeSlotId: string,
  ): Promise<DeliveryCapacity> {
    const capacityRepository = manager.getRepository(DeliveryCapacity);

    const capacity = await capacityRepository.findOne({
      where: {
        deliveryDate,
        timeSlotId,
      },
      lock: {
        mode: 'pessimistic_write',
      },
    });

    if (!capacity) {
      throw new NotFoundException('Không tìm thấy sức chứa giao hàng phù hợp');
    }

    if (capacity.reservedOrders <= 0) {
      throw new ConflictException('Số đơn đã giữ chỗ hiện đang bằng 0');
    }

    capacity.reservedOrders -= 1;

    return capacityRepository.save(capacity);
  }

  private validateDateParameter(date: string): void {
    if (!date) {
      throw new BadRequestException('Ngày giao hàng là bắt buộc');
    }

    if (!this.isValidDateOnly(date)) {
      throw new BadRequestException(
        'Ngày giao hàng phải có định dạng YYYY-MM-DD',
      );
    }
  }

  private isValidDateOnly(date: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return false;
    }

    const [year, month, day] = date.split('-').map(Number);

    const parsed = new Date(Date.UTC(year, month - 1, day));

    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  }

  private getTodayInJapan(): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const year = parts.find((part) => part.type === 'year')?.value ?? '';

    const month = parts.find((part) => part.type === 'month')?.value ?? '';

    const day = parts.find((part) => part.type === 'day')?.value ?? '';

    return `${year}-${month}-${day}`;
  }

  private buildAreaResponse(area: DeliveryArea) {
    return {
      id: area.id,
      prefecture: area.prefecture,
      city: area.city,
      areaName: area.areaName,
      deliveryFee: Number(area.deliveryFee),
      isActive: area.isActive,
    };
  }

  private buildTimeSlotResponse(capacity: DeliveryCapacity) {
    const remainingOrders = capacity.maxOrders - capacity.reservedOrders;

    return {
      capacityId: capacity.id,
      deliveryDate: capacity.deliveryDate,

      timeSlot: {
        id: capacity.timeSlot.id,
        slotCode: capacity.timeSlot.slotCode,
        displayName: capacity.timeSlot.displayName,
        startTime: capacity.timeSlot.startTime,
        endTime: capacity.timeSlot.endTime,
        sortOrder: capacity.timeSlot.sortOrder,
      },

      maxOrders: capacity.maxOrders,
      reservedOrders: capacity.reservedOrders,
      remainingOrders,
      isAvailable: remainingOrders > 0,
    };
  }
}
