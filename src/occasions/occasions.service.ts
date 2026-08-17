import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateOccasionDto } from './dto/create-occasion.dto';
import { UpdateOccasionDto } from './dto/update-occasion.dto';
import { Occasion } from './entities/occasion.entity';

@Injectable()
export class OccasionsService {
  constructor(
    @InjectRepository(Occasion)
    private readonly occasionRepository: Repository<Occasion>,
  ) {}

  async findAll(): Promise<Occasion[]> {
    return this.occasionRepository.find({
      where: {
        isActive: true,
      },
      order: {
        sortOrder: 'ASC',
        id: 'ASC',
      },
    });
  }

  async findAllForAdmin(): Promise<Occasion[]> {
    return this.occasionRepository.find({
      withDeleted: true,
      order: {
        sortOrder: 'ASC',
        id: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Occasion> {
    const occasion = await this.occasionRepository.findOne({
      where: {
        id,
        isActive: true,
      },
    });

    if (!occasion) {
      throw new NotFoundException('用途が見つかりません。');
    }

    return occasion;
  }

  async findOneForAdmin(id: string): Promise<Occasion> {
    const occasion = await this.occasionRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!occasion) {
      throw new NotFoundException('用途が見つかりません。');
    }

    return occasion;
  }

  async findBySlug(slug: string): Promise<Occasion> {
    const occasion = await this.occasionRepository.findOne({
      where: {
        slug,
        isActive: true,
      },
    });

    if (!occasion) {
      throw new NotFoundException('用途が見つかりません。');
    }

    return occasion;
  }

  async create(dto: CreateOccasionDto): Promise<Occasion> {
    const existing = await this.occasionRepository.findOne({
      where: {
        slug: dto.slug,
      },
      withDeleted: true,
    });

    if (existing) {
      throw new ConflictException('このスラッグは既に使用されています。');
    }

    const occasion = this.occasionRepository.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description ?? null,
      imageUrl: dto.imageUrl ?? null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });

    return this.occasionRepository.save(occasion);
  }

  async update(id: string, dto: UpdateOccasionDto): Promise<Occasion> {
    const occasion = await this.occasionRepository.findOne({
      where: { id },
    });

    if (!occasion) {
      throw new NotFoundException('用途が見つかりません。');
    }

    if (dto.slug && dto.slug !== occasion.slug) {
      const existing = await this.occasionRepository.findOne({
        where: {
          slug: dto.slug,
        },
        withDeleted: true,
      });

      if (existing) {
        throw new ConflictException('このスラッグは既に使用されています。');
      }
    }

    this.occasionRepository.merge(occasion, dto);

    return this.occasionRepository.save(occasion);
  }

  async remove(id: string): Promise<{ message: string }> {
    const occasion = await this.occasionRepository.findOne({
      where: { id },
    });

    if (!occasion) {
      throw new NotFoundException('用途が見つかりません。');
    }

    await this.occasionRepository.softRemove(occasion);

    return {
      message: '用途を削除しました。',
    };
  }

  async restore(id: string): Promise<Occasion> {
    const occasion = await this.occasionRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!occasion) {
      throw new NotFoundException('用途が見つかりません。');
    }

    if (!occasion.deletedAt) {
      return occasion;
    }

    await this.occasionRepository.restore(id);

    const restoredOccasion = await this.occasionRepository.findOne({
      where: { id },
    });

    if (!restoredOccasion) {
      throw new NotFoundException('用途の復元に失敗しました。');
    }

    return restoredOccasion;
  }
}
