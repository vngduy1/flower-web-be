import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Brackets, IsNull, Repository } from 'typeorm';

import { Category } from '../categories/entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ProductStatus } from './enums/product-status.enum';
import { Inventory } from '../inventories/entities/inventory.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,

    private readonly dataSource: DataSource,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const productCode = this.normalizeProductCode(createProductDto.productCode);

    const slug = this.normalizeSlug(createProductDto.slug);

    await this.validateProductCode(productCode);
    await this.validateSlug(slug);
    await this.validateCategory(createProductDto.categoryId);

    this.validatePrices(
      createProductDto.basePrice,
      createProductDto.salePrice,
      createProductDto.costPrice,
    );

    this.validateAvailabilityPeriod(
      createProductDto.availableFrom,
      createProductDto.availableUntil,
    );

    const savedProductId = await this.dataSource.transaction(
      async (manager) => {
        const productRepository = manager.getRepository(Product);
        const inventoryRepository = manager.getRepository(Inventory);

        const product = productRepository.create({
          productCode,
          name: createProductDto.name.trim(),
          slug,
          categoryId: createProductDto.categoryId,
          description: createProductDto.description?.trim() || null,
          basePrice: createProductDto.basePrice,
          salePrice: createProductDto.salePrice ?? null,
          costPrice: createProductDto.costPrice ?? null,
          status: createProductDto.status ?? ProductStatus.DRAFT,
          isFeatured: createProductDto.isFeatured ?? false,
          availableFrom: createProductDto.availableFrom
            ? new Date(createProductDto.availableFrom)
            : null,
          availableUntil: createProductDto.availableUntil
            ? new Date(createProductDto.availableUntil)
            : null,
          preparationDays: createProductDto.preparationDays ?? 0,
        });

        const savedProduct = await productRepository.save(product);

        const inventory = inventoryRepository.create({
          productId: savedProduct.id,
          stockQuantity: 0,
          reservedQuantity: 0,
          isStockManaged: true,
        });

        await inventoryRepository.save(inventory);

        return savedProduct.id;
      },
    );

    return this.findManagedProduct(savedProductId);
  }

  async findAll(query: QueryProductDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.deletedAt IS NULL')
      .andWhere('product.status = :publicStatus', {
        publicStatus: ProductStatus.ACTIVE,
      });

    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;

      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('product.name LIKE :keyword', { keyword })
            .orWhere('product.productCode LIKE :keyword', { keyword })
            .orWhere('product.slug LIKE :keyword', { keyword });
        }),
      );
    }

    if (query.categoryId) {
      const category = await this.categoriesRepository.findOne({
        where: {
          id: query.categoryId,
          deletedAt: IsNull(),
          isActive: true,
        },
        relations: {
          children: true,
        },
      });

      if (!category) {
        throw new NotFoundException('Không tìm thấy danh mục');
      }

      const categoryIds = [
        category.id,
        ...category.children
          .filter((child) => child.isActive && !child.deletedAt)
          .map((child) => child.id),
      ];

      queryBuilder.andWhere('product.categoryId IN (:...categoryIds)', {
        categoryIds,
      });
    }

    if (query.isFeatured !== undefined) {
      queryBuilder.andWhere('product.isFeatured = :isFeatured', {
        isFeatured: query.isFeatured === 'true',
      });
    }

    queryBuilder.orderBy('product.createdAt', 'DESC').skip(skip).take(limit);

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

  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: {
        id,
        status: ProductStatus.ACTIVE,
        deletedAt: IsNull(),
      },
      relations: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findManagedProduct(id);

    if (updateProductDto.productCode !== undefined) {
      const productCode = this.normalizeProductCode(
        updateProductDto.productCode,
      );

      await this.validateProductCode(productCode, id);

      product.productCode = productCode;
    }

    if (updateProductDto.name !== undefined) {
      product.name = updateProductDto.name.trim();
    }

    if (updateProductDto.slug !== undefined) {
      const slug = this.normalizeSlug(updateProductDto.slug);

      await this.validateSlug(slug, id);

      product.slug = slug;
    }

    if (updateProductDto.categoryId !== undefined) {
      const category = await this.validateCategory(updateProductDto.categoryId);

      product.categoryId = category.id;
      product.category = category;
    }

    if (updateProductDto.description !== undefined) {
      product.description = updateProductDto.description.trim() || null;
    }

    const basePrice = updateProductDto.basePrice ?? product.basePrice;

    const salePrice =
      updateProductDto.salePrice !== undefined
        ? updateProductDto.salePrice
        : product.salePrice;

    const costPrice =
      updateProductDto.costPrice !== undefined
        ? updateProductDto.costPrice
        : product.costPrice;

    this.validatePrices(
      basePrice,
      salePrice ?? undefined,
      costPrice ?? undefined,
    );

    if (updateProductDto.basePrice !== undefined) {
      product.basePrice = updateProductDto.basePrice;
    }

    if (updateProductDto.salePrice !== undefined) {
      product.salePrice = updateProductDto.salePrice;
    }

    if (updateProductDto.costPrice !== undefined) {
      product.costPrice = updateProductDto.costPrice;
    }

    if (updateProductDto.status !== undefined) {
      product.status = updateProductDto.status;
    }

    if (updateProductDto.isFeatured !== undefined) {
      product.isFeatured = updateProductDto.isFeatured;
    }

    const availableFrom =
      updateProductDto.availableFrom !== undefined
        ? updateProductDto.availableFrom
        : product.availableFrom?.toISOString();

    const availableUntil =
      updateProductDto.availableUntil !== undefined
        ? updateProductDto.availableUntil
        : product.availableUntil?.toISOString();

    this.validateAvailabilityPeriod(availableFrom, availableUntil);

    if (updateProductDto.availableFrom !== undefined) {
      product.availableFrom = new Date(updateProductDto.availableFrom);
    }

    if (updateProductDto.availableUntil !== undefined) {
      product.availableUntil = new Date(updateProductDto.availableUntil);
    }

    if (updateProductDto.preparationDays !== undefined) {
      product.preparationDays = updateProductDto.preparationDays;
    }

    await this.productsRepository.save(product);

    await this.productsRepository.findOne({
      where: { id },
    });

    return this.findManagedProduct(id);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findManagedProduct(id);

    await this.productsRepository.softRemove(product);
  }

  async restore(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    if (!product.deletedAt) {
      throw new ConflictException('Sản phẩm chưa bị xóa');
    }

    await this.validateCategory(product.categoryId);

    await this.productsRepository.restore(id);

    return this.findManagedProduct(id);
  }

  private async findManagedProduct(id: string): Promise<Product> {
    const product = await this.productsRepository
      .createQueryBuilder('product')
      .addSelect('product.costPrice')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.id = :id', { id })
      .andWhere('product.deletedAt IS NULL')
      .getOne();

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    return product;
  }

  private async validateCategory(categoryId: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: {
        id: categoryId,
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    if (!category) {
      throw new NotFoundException(
        'Danh mục không tồn tại, đã bị xóa hoặc đang ngừng hoạt động',
      );
    }

    return category;
  }

  private async validateProductCode(
    productCode: string,
    currentProductId?: string,
  ): Promise<void> {
    const existingProduct = await this.productsRepository.findOne({
      where: { productCode },
      withDeleted: true,
    });

    if (existingProduct && existingProduct.id !== currentProductId) {
      throw new ConflictException('Mã sản phẩm đã tồn tại');
    }
  }

  private async validateSlug(
    slug: string,
    currentProductId?: string,
  ): Promise<void> {
    const existingProduct = await this.productsRepository.findOne({
      where: { slug },
      withDeleted: true,
    });

    if (existingProduct && existingProduct.id !== currentProductId) {
      throw new ConflictException('Slug sản phẩm đã tồn tại');
    }
  }

  private validatePrices(
    basePrice: string,
    salePrice?: string | null,
    costPrice?: string | null,
  ): void {
    const basePriceNumber = Number(basePrice);

    if (!Number.isFinite(basePriceNumber) || basePriceNumber < 0) {
      throw new ConflictException('Giá cơ bản không hợp lệ');
    }

    if (salePrice !== undefined && salePrice !== null) {
      const salePriceNumber = Number(salePrice);

      if (!Number.isFinite(salePriceNumber) || salePriceNumber < 0) {
        throw new ConflictException('Giá khuyến mãi không hợp lệ');
      }

      if (salePriceNumber > basePriceNumber) {
        throw new ConflictException(
          'Giá khuyến mãi không được lớn hơn giá cơ bản',
        );
      }
    }

    if (costPrice !== undefined && costPrice !== null) {
      const costPriceNumber = Number(costPrice);

      if (!Number.isFinite(costPriceNumber) || costPriceNumber < 0) {
        throw new ConflictException('Giá vốn không hợp lệ');
      }
    }
  }

  private validateAvailabilityPeriod(
    availableFrom?: string,
    availableUntil?: string,
  ): void {
    if (!availableFrom || !availableUntil) {
      return;
    }

    const from = new Date(availableFrom);
    const until = new Date(availableUntil);

    if (from >= until) {
      throw new ConflictException(
        'Ngày kết thúc bán phải sau ngày bắt đầu bán',
      );
    }
  }

  private normalizeProductCode(productCode: string): string {
    return productCode.trim().toUpperCase().replace(/\s+/g, '-');
  }

  private normalizeSlug(slug: string): string {
    return slug
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async getCurrentCostPrice(id: string): Promise<string | null> {
    const product = await this.productsRepository
      .createQueryBuilder('product')
      .addSelect('product.costPrice')
      .where('product.id = :id', { id })
      .andWhere('product.deletedAt IS NULL')
      .getOne();

    return product?.costPrice ?? null;
  }
}
