import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';
import { QueryCategoryDto } from './dto/query-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const name = createCategoryDto.name.trim();
    const slug = this.normalizeSlug(createCategoryDto.slug);

    await this.validateDuplicateSlug(slug);

    if (createCategoryDto.parentId) {
      await this.findActiveCategory(createCategoryDto.parentId);
    }

    const category = this.categoriesRepository.create({
      parentId: createCategoryDto.parentId ?? null,
      name,
      slug,
      isActive: createCategoryDto.isActive ?? true,
    });

    const savedCategory = await this.categoriesRepository.save(category);

    return this.findOne(savedCategory.id);
  }

  async findAll(query: QueryCategoryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.categoriesRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.parent', 'parent')
      .leftJoinAndSelect('category.children', 'children');

    if (query.deletedOnly === true) {
      queryBuilder.withDeleted().andWhere('category.deletedAt IS NOT NULL');
    } else {
      queryBuilder.andWhere('category.deletedAt IS NULL');
    }

    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;

      queryBuilder.andWhere(
        `(
        category.name LIKE :keyword
        OR category.slug LIKE :keyword
      )`,
        { keyword },
      );
    }

    queryBuilder.orderBy('category.id', 'ASC').skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
      relations: {
        parent: true,
        children: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id);

    if (updateCategoryDto.name !== undefined) {
      category.name = updateCategoryDto.name.trim();
    }

    if (updateCategoryDto.slug !== undefined) {
      const slug = this.normalizeSlug(updateCategoryDto.slug);

      await this.validateDuplicateSlug(slug, id);

      category.slug = slug;
    }

    if (updateCategoryDto.parentId !== undefined) {
      await this.validateParentCategory(id, updateCategoryDto.parentId);

      category.parentId = updateCategoryDto.parentId || null;
    }

    if (updateCategoryDto.isActive !== undefined) {
      category.isActive = updateCategoryDto.isActive;
    }

    await this.categoriesRepository.save(category);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    const activeChildCount = await this.categoriesRepository.count({
      where: {
        parentId: id,
        deletedAt: IsNull(),
      },
    });

    if (activeChildCount > 0) {
      throw new ConflictException(
        'Không thể xóa danh mục đang có danh mục con',
      );
    }

    await this.categoriesRepository.softRemove(category);
  }

  async restore(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    if (!category.deletedAt) {
      throw new ConflictException('Danh mục chưa bị xóa');
    }

    if (category.parentId) {
      const parent = await this.categoriesRepository.findOne({
        where: {
          id: category.parentId,
          deletedAt: IsNull(),
        },
      });

      if (!parent) {
        throw new ConflictException(
          'Không thể khôi phục vì danh mục cha không tồn tại hoặc đã bị xóa',
        );
      }
    }

    await this.categoriesRepository.restore(id);

    return this.findOne(id);
  }

  private async findActiveCategory(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
    });

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục cha');
    }

    return category;
  }

  private async validateDuplicateSlug(
    slug: string,
    currentCategoryId?: string,
  ): Promise<void> {
    const existingCategory = await this.categoriesRepository.findOne({
      where: { slug },
      withDeleted: true,
    });

    if (existingCategory && existingCategory.id !== currentCategoryId) {
      throw new ConflictException('Slug danh mục đã tồn tại');
    }
  }

  private async validateParentCategory(
    categoryId: string,
    parentId?: string | null,
  ): Promise<void> {
    if (!parentId) {
      return;
    }

    if (categoryId === parentId) {
      throw new ConflictException('Danh mục không thể là cha của chính nó');
    }

    await this.findActiveCategory(parentId);

    await this.validateCategoryCycle(categoryId, parentId);
  }

  private async validateCategoryCycle(
    categoryId: string,
    parentId: string,
  ): Promise<void> {
    let currentParentId: string | null = parentId;

    while (currentParentId) {
      if (currentParentId === categoryId) {
        throw new ConflictException('Không thể tạo quan hệ danh mục vòng lặp');
      }

      const parent = await this.categoriesRepository.findOne({
        where: {
          id: currentParentId,
          deletedAt: IsNull(),
        },
        select: {
          id: true,
          parentId: true,
        },
      });

      if (!parent) {
        break;
      }

      currentParentId = parent.parentId;
    }
  }

  private normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase().replace(/\s+/g, '-');
  }
}
