import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, IsNull, SelectQueryBuilder } from 'typeorm';

import { AdminProductQueryDto } from './dto/admin-product-query.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class AdminProductsService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(query: AdminProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.dataSource
      .getRepository(Product)
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.inventory', 'inventory')
      .leftJoinAndSelect(
        'product.images',
        'image',
        'image.isPrimary = :isPrimary',
        { isPrimary: true },
      )
      .select([
        'product.id',
        'product.productCode',
        'product.name',
        'product.slug',
        'product.basePrice',
        'product.salePrice',
        'product.status',
        'product.isFeatured',
        'product.availableFrom',
        'product.availableUntil',
        'product.createdAt',
        'product.updatedAt',
        'product.deletedAt',

        'category.id',
        'category.name',
        'category.slug',

        'inventory.id',
        'inventory.stockQuantity',
        'inventory.reservedQuantity',
        'inventory.lowStockThreshold',
        'inventory.isStockManaged',

        'image.id',
        'image.imageUrl',
        'image.thumbnailUrl',
        'image.isPrimary',
        'image.sortOrder',
        'image.deletedAt',
      ]);

    if (query.deletedOnly === true) {
      queryBuilder.withDeleted().andWhere('product.deletedAt IS NOT NULL');
    } else {
      queryBuilder.andWhere('product.deletedAt IS NULL');
    }

    if (query.keyword?.trim()) {
      queryBuilder.andWhere(
        `(
          product.name LIKE :keyword
          OR product.productCode LIKE :keyword
          OR product.slug LIKE :keyword
        )`,
        {
          keyword: `%${query.keyword.trim()}%`,
        },
      );
    }

    if (query.categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('product.status = :status', {
        status: query.status,
      });
    }

    if (query.isFeatured !== undefined) {
      queryBuilder.andWhere('product.isFeatured = :isFeatured', {
        isFeatured: query.isFeatured,
      });
    }

    if (query.stockStatus && query.stockStatus !== 'ALL') {
      if (query.stockStatus === 'OUT_OF_STOCK') {
        queryBuilder.andWhere(
          `
          inventory.is_stock_managed = true
          AND (
            inventory.stock_quantity
            - inventory.reserved_quantity
          ) <= 0
          `,
        );
      }

      if (query.stockStatus === 'LOW_STOCK') {
        queryBuilder.andWhere(
          `
          inventory.is_stock_managed = true
          AND (
            inventory.stock_quantity
            - inventory.reserved_quantity
          ) > 0
          AND (
            inventory.stock_quantity
            - inventory.reserved_quantity
          ) <= inventory.low_stock_threshold
          `,
        );
      }

      if (query.stockStatus === 'IN_STOCK') {
        queryBuilder.andWhere(
          `
          (
            inventory.is_stock_managed = false
            OR (
              inventory.stock_quantity
              - inventory.reserved_quantity
            ) > inventory.low_stock_threshold
          )
          `,
        );
      }
    }

    this.applySorting(queryBuilder, query.sortBy, query.sortOrder);

    queryBuilder.skip(skip).take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    return {
      items: products.map((product) => this.buildProductSummary(product)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(productId: string) {
    const product = await this.dataSource
      .getRepository(Product)
      .createQueryBuilder('product')
      .addSelect('product.costPrice')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.inventory', 'inventory')
      .where('product.id = :productId', { productId })
      .andWhere('product.deletedAt IS NULL')
      .getOne();

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    return this.buildProductDetail(product);
  }

  async updateStatus(productId: string, dto: UpdateProductStatusDto) {
    const productRepository = this.dataSource.getRepository(Product);

    const product = await productRepository.findOne({
      where: {
        id: productId,
        deletedAt: IsNull(),
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    if (product.status === dto.status) {
      throw new ConflictException('Sản phẩm đã ở trạng thái được yêu cầu');
    }

    product.status = dto.status;

    await productRepository.save(product);

    return this.findOne(productId);
  }

  async remove(productId: string) {
    const productRepository = this.dataSource.getRepository(Product);

    const product = await productRepository.findOne({
      where: {
        id: productId,
        deletedAt: IsNull(),
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    await productRepository.softRemove(product);

    return {
      message: 'Đã xóa sản phẩm',
    };
  }

  private applySorting(
    queryBuilder: SelectQueryBuilder<Product>,
    sortBy: AdminProductQueryDto['sortBy'],
    sortOrder: AdminProductQueryDto['sortOrder'],
  ): void {
    const sortMap: Record<string, string> = {
      createdAt: 'product.createdAt',
      updatedAt: 'product.updatedAt',
      name: 'product.name',
      basePrice: 'product.basePrice',
      salePrice: 'product.salePrice',
      stockQuantity: 'inventory.stockQuantity',
    };

    queryBuilder.orderBy(
      sortMap[sortBy] ?? 'product.createdAt',
      sortOrder ?? 'DESC',
    );
  }

  private buildProductSummary(product: Product) {
    const inventory = product.inventory;

    const availableQuantity =
      inventory?.isStockManaged === false
        ? null
        : Math.max(
            (inventory?.stockQuantity ?? 0) -
              (inventory?.reservedQuantity ?? 0),
            0,
          );

    let stockStatus = 'NOT_MANAGED';

    if (inventory?.isStockManaged) {
      if ((availableQuantity ?? 0) <= 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if ((availableQuantity ?? 0) <= inventory.lowStockThreshold) {
        stockStatus = 'LOW_STOCK';
      } else {
        stockStatus = 'IN_STOCK';
      }
    }

    const primaryImage =
      product.images?.find(
        (image) => image.isPrimary && image.deletedAt === null,
      ) ?? null;

    return {
      id: product.id,
      productCode: product.productCode,
      name: product.name,
      slug: product.slug,

      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
          }
        : null,

      basePrice: Number(product.basePrice),
      salePrice: product.salePrice !== null ? Number(product.salePrice) : null,

      currentPrice:
        product.salePrice !== null
          ? Number(product.salePrice)
          : Number(product.basePrice),

      status: product.status,
      isFeatured: product.isFeatured,

      thumbnailUrl: primaryImage?.thumbnailUrl ?? null,

      inventory: inventory
        ? {
            stockQuantity: inventory.stockQuantity,
            reservedQuantity: inventory.reservedQuantity,
            availableQuantity,
            lowStockThreshold: inventory.lowStockThreshold,
            isStockManaged: inventory.isStockManaged,
            stockStatus,
          }
        : null,

      availableFrom: product.availableFrom,
      availableUntil: product.availableUntil,

      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt,
    };
  }

  private buildProductDetail(product: Product) {
    return {
      ...this.buildProductSummary(product),

      product: {
        id: product.id,
        productCode: product.productCode,
        name: product.name,
        slug: product.slug,
        categoryId: product.categoryId,
        category: product.category,
        description: product.description,
        basePrice: product.basePrice,
        salePrice: product.salePrice,
        costPrice: product.costPrice,
        status: product.status,
        isFeatured: product.isFeatured,
        availableFrom: product.availableFrom,
        availableUntil: product.availableUntil,
        preparationDays: product.preparationDays,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        deletedAt: product.deletedAt,
      },

      images:
        product.images
          ?.filter((image) => image.deletedAt === null)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((image) => ({
            id: image.id,
            imageUrl: image.imageUrl,
            thumbnailUrl: image.thumbnailUrl,
            isPrimary: image.isPrimary,
            sortOrder: image.sortOrder,
          })) ?? [],
    };
  }
}
