import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateDeliveryAreaDto } from './dto/create-delivery-area.dto';
import { UpdateDeliveryAreaDto } from './dto/update-delivery-area.dto';
import { DeliveryArea } from './entities/delivery-area.entity';

@Injectable()
export class DeliveryAreasService {
  constructor(
    @InjectRepository(DeliveryArea)
    private readonly deliveryAreaRepository: Repository<DeliveryArea>,
  ) {}

  async create(dto: CreateDeliveryAreaDto) {
    const prefecture = dto.prefecture.trim();
    const city = dto.city.trim();
    const areaName = dto.areaName.trim();

    const existing = await this.deliveryAreaRepository.findOne({
      where: {
        prefecture,
        city,
        areaName,
      },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('Khu vực giao hàng này đã tồn tại');
      }

      existing.deliveryFee = dto.deliveryFee.toString();
      existing.isActive = dto.isActive ?? true;

      const restored = await this.deliveryAreaRepository.save(existing);

      return this.buildResponse(restored);
    }

    const deliveryArea = this.deliveryAreaRepository.create({
      prefecture,
      city,
      areaName,
      deliveryFee: dto.deliveryFee.toString(),
      isActive: dto.isActive ?? true,
    });

    const saved = await this.deliveryAreaRepository.save(deliveryArea);

    return this.buildResponse(saved);
  }

  async findAll() {
    const deliveryAreas = await this.deliveryAreaRepository.find({
      order: {
        prefecture: 'ASC',
        city: 'ASC',
      },
    });

    return deliveryAreas.map((area) => this.buildResponse(area));
  }

  async findOne(id: string) {
    const deliveryArea = await this.deliveryAreaRepository.findOne({
      where: {
        id,
      },
    });

    if (!deliveryArea) {
      throw new NotFoundException('Không tìm thấy khu vực giao hàng');
    }

    return this.buildResponse(deliveryArea);
  }

  async findByAddress(prefecture: string, fullCity: string) {
    const normalizedPrefecture = prefecture.trim();
    const normalizedCity = fullCity.trim();

    const areas = await this.deliveryAreaRepository.find({
      where: {
        prefecture: normalizedPrefecture,
        isActive: true,
      },
    });

    const matchedArea = areas.find((area) => {
      const fullAreaName =
        area.areaName === '全域' ? area.city : `${area.city}${area.areaName}`;

      return fullAreaName === normalizedCity;
    });

    if (!matchedArea) {
      return null;
    }

    return this.buildResponse(matchedArea);
  }

  async update(id: string, dto: UpdateDeliveryAreaDto) {
    const deliveryArea = await this.deliveryAreaRepository.findOne({
      where: {
        id,
      },
    });

    if (!deliveryArea) {
      throw new NotFoundException('Không tìm thấy khu vực giao hàng');
    }

    const prefecture = dto.prefecture?.trim() ?? deliveryArea.prefecture;

    const city = dto.city?.trim() ?? deliveryArea.city;

    const areaName = dto.areaName?.trim() ?? deliveryArea.areaName;

    const duplicate = await this.deliveryAreaRepository.findOne({
      where: {
        prefecture,
        city,
        areaName,
      },
    });

    if (duplicate && duplicate.id !== id) {
      throw new ConflictException('Khu vực giao hàng này đã tồn tại');
    }

    deliveryArea.prefecture = prefecture;
    deliveryArea.city = city;
    deliveryArea.areaName = areaName;

    if (dto.deliveryFee !== undefined) {
      deliveryArea.deliveryFee = dto.deliveryFee.toString();
    }

    if (dto.isActive !== undefined) {
      deliveryArea.isActive = dto.isActive;
    }

    const saved = await this.deliveryAreaRepository.save(deliveryArea);

    return this.buildResponse(saved);
  }

  async remove(id: string) {
    const deliveryArea = await this.deliveryAreaRepository.findOne({
      where: {
        id,
      },
    });

    if (!deliveryArea) {
      throw new NotFoundException('Không tìm thấy khu vực giao hàng');
    }

    deliveryArea.isActive = false;

    await this.deliveryAreaRepository.save(deliveryArea);

    return {
      message: 'Đã vô hiệu hóa khu vực giao hàng',
    };
  }

  private buildResponse(deliveryArea: DeliveryArea) {
    return {
      id: deliveryArea.id,
      prefecture: deliveryArea.prefecture,
      city: deliveryArea.city,
      areaName: deliveryArea.areaName,
      deliveryFee: Number(deliveryArea.deliveryFee),
      isActive: deliveryArea.isActive,
      createdAt: deliveryArea.createdAt,
      updatedAt: deliveryArea.updatedAt,
    };
  }
}
