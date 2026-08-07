import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';

import { Product } from '../products/entities/product.entity';

import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { AdminInventoryQueryDto } from './dto/admin-inventory-query.dto';
import { InventoryHistoryQueryDto } from './dto/inventory-history-query.dto';
import { UpdateInventorySettingsDto } from './dto/update-inventory-settings.dto';
import { InventoryHistory } from './entities/inventory-history.entity';
import { Inventory } from './entities/inventory.entity';
import { InventoryChangeType } from './enums/inventory-change-type.enum';

@Injectable()
export class AdminInventoriesService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(query: AdminInventoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.dataSource
      .getRepository(Inventory)
      .createQueryBuilder('inventory')
      .innerJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.deletedAt IS NULL');

    if (query.keyword?.trim()) {
      qb.andWhere(
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
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.stockStatus && query.stockStatus !== 'ALL') {
      switch (query.stockStatus) {
        case 'NOT_MANAGED':
          qb.andWhere('inventory.isStockManaged = :managed', {
            managed: false,
          });
          break;

        case 'OUT_OF_STOCK':
          qb.andWhere(
            `
            inventory.isStockManaged = true
            AND (
              inventory.stockQuantity
              - inventory.reservedQuantity
            ) <= 0
            `,
          );
          break;

        case 'LOW_STOCK':
          qb.andWhere(
            `
            inventory.isStockManaged = true
            AND (
              inventory.stockQuantity
              - inventory.reservedQuantity
            ) > 0
            AND (
              inventory.stockQuantity
              - inventory.reservedQuantity
            ) <= inventory.lowStockThreshold
            `,
          );
          break;

        case 'IN_STOCK':
          qb.andWhere(
            `
            inventory.isStockManaged = true
            AND (
              inventory.stockQuantity
              - inventory.reservedQuantity
            ) > inventory.lowStockThreshold
            `,
          );
          break;
      }
    }

    const sortMap: Record<string, string> = {
      productName: 'product.name',
      stockQuantity: 'inventory.stockQuantity',
      availableQuantity:
        '(inventory.stockQuantity - inventory.reservedQuantity)',
      updatedAt: 'inventory.updatedAt',
    };

    qb.orderBy(sortMap[query.sortBy ?? 'updatedAt'], query.sortOrder ?? 'DESC')
      .skip(skip)
      .take(limit);

    const [inventories, total] = await qb.getManyAndCount();

    return {
      items: inventories.map((inventory) =>
        this.buildInventoryResponse(inventory),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(productId: string) {
    const inventory = await this.dataSource.getRepository(Inventory).findOne({
      where: {
        productId,
      },
      relations: {
        product: {
          category: true,
        },
      },
    });

    if (!inventory || inventory.product.deletedAt !== null) {
      throw new NotFoundException('Không tìm thấy thông tin tồn kho');
    }

    return this.buildInventoryResponse(inventory);
  }

  async updateSettings(productId: string, dto: UpdateInventorySettingsDto) {
    if (
      dto.isStockManaged === undefined &&
      dto.lowStockThreshold === undefined
    ) {
      throw new BadRequestException('Không có thiết lập cần cập nhật');
    }

    const inventoryRepository = this.dataSource.getRepository(Inventory);

    const inventory = await inventoryRepository.findOne({
      where: {
        productId,
      },
      relations: {
        product: true,
      },
    });

    if (!inventory) {
      throw new NotFoundException('Không tìm thấy thông tin tồn kho');
    }

    if (dto.isStockManaged !== undefined) {
      inventory.isStockManaged = dto.isStockManaged;
    }

    if (dto.lowStockThreshold !== undefined) {
      inventory.lowStockThreshold = dto.lowStockThreshold;
    }

    await inventoryRepository.save(inventory);

    return this.findOne(productId);
  }

  async adjust(
    adminUserId: string,
    productId: string,
    dto: AdjustInventoryDto,
  ) {
    const allowedTypes = [
      InventoryChangeType.IMPORT,
      InventoryChangeType.MANUAL_INCREASE,
      InventoryChangeType.MANUAL_DECREASE,
      InventoryChangeType.ADJUSTMENT,
    ];

    if (!allowedTypes.includes(dto.changeType)) {
      throw new BadRequestException(
        'Loại thay đổi tồn kho không được phép qua API admin',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const inventoryRepository = manager.getRepository(Inventory);

      const historyRepository = manager.getRepository(InventoryHistory);

      const inventory = await inventoryRepository.findOne({
        where: {
          productId,
        },
        relations: {
          product: true,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!inventory) {
        throw new NotFoundException('Không tìm thấy thông tin tồn kho');
      }

      if (!inventory.isStockManaged) {
        throw new ConflictException('Sản phẩm hiện không quản lý tồn kho');
      }

      const quantityBefore = inventory.stockQuantity;

      let quantityAfter = quantityBefore;

      switch (dto.changeType) {
        case InventoryChangeType.IMPORT:
        case InventoryChangeType.MANUAL_INCREASE:
          if (dto.quantity <= 0) {
            throw new BadRequestException('Số lượng tăng phải lớn hơn 0');
          }

          quantityAfter = quantityBefore + dto.quantity;
          break;

        case InventoryChangeType.MANUAL_DECREASE:
          if (dto.quantity <= 0) {
            throw new BadRequestException('Số lượng giảm phải lớn hơn 0');
          }

          quantityAfter = quantityBefore - dto.quantity;
          break;

        case InventoryChangeType.ADJUSTMENT:
          quantityAfter = dto.quantity;
          break;
      }

      if (quantityAfter < 0) {
        throw new ConflictException('Tồn kho không thể nhỏ hơn 0');
      }

      if (quantityAfter < inventory.reservedQuantity) {
        throw new ConflictException(
          'Tồn kho mới không thể nhỏ hơn số lượng đang được giữ cho đơn hàng',
        );
      }

      inventory.stockQuantity = quantityAfter;

      await inventoryRepository.save(inventory);

      const history = historyRepository.create({
        inventoryId: inventory.id,
        productId: inventory.productId,
        changeType: dto.changeType,

        quantityBefore,
        quantityChange: quantityAfter - quantityBefore,
        quantityAfter,

        reservedBefore: inventory.reservedQuantity,
        reservedAfter: inventory.reservedQuantity,

        reason: dto.reason?.trim() || null,
        changedByUserId: adminUserId,
      });

      await historyRepository.save(history);
    });

    return this.findOne(productId);
  }

  async findHistories(productId: string, query: InventoryHistoryQueryDto) {
    await this.ensureProductExists(productId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.dataSource
      .getRepository(InventoryHistory)
      .createQueryBuilder('history')
      .leftJoinAndSelect('history.changedByUser', 'changedByUser')
      .where('history.productId = :productId', {
        productId,
      })
      .orderBy('history.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.changeType) {
      qb.andWhere('history.changeType = :changeType', {
        changeType: query.changeType,
      });
    }

    const [histories, total] = await qb.getManyAndCount();

    return {
      items: histories.map((history) => ({
        id: history.id,
        changeType: history.changeType,

        quantityBefore: history.quantityBefore,
        quantityChange: history.quantityChange,
        quantityAfter: history.quantityAfter,

        reservedBefore: history.reservedBefore,
        reservedAfter: history.reservedAfter,

        reason: history.reason,

        changedBy: history.changedByUser
          ? {
              id: history.changedByUser.id,
              fullName: history.changedByUser.fullName,
              email: history.changedByUser.email,
            }
          : null,

        createdAt: history.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async ensureProductExists(productId: string): Promise<void> {
    const product = await this.dataSource.getRepository(Product).findOne({
      where: {
        id: productId,
        deletedAt: IsNull(),
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
  }

  private buildInventoryResponse(inventory: Inventory) {
    const availableQuantity = inventory.isStockManaged
      ? Math.max(inventory.stockQuantity - inventory.reservedQuantity, 0)
      : null;

    let stockStatus = 'NOT_MANAGED';

    if (inventory.isStockManaged) {
      if ((availableQuantity ?? 0) <= 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if ((availableQuantity ?? 0) <= inventory.lowStockThreshold) {
        stockStatus = 'LOW_STOCK';
      } else {
        stockStatus = 'IN_STOCK';
      }
    }

    return {
      id: inventory.id,

      product: {
        id: inventory.product.id,
        productCode: inventory.product.productCode,
        name: inventory.product.name,
        slug: inventory.product.slug,

        category: inventory.product.category
          ? {
              id: inventory.product.category.id,
              name: inventory.product.category.name,
            }
          : null,
      },

      stockQuantity: inventory.stockQuantity,
      reservedQuantity: inventory.reservedQuantity,
      availableQuantity,

      lowStockThreshold: inventory.lowStockThreshold,
      isStockManaged: inventory.isStockManaged,

      stockStatus,

      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
    };
  }
}
