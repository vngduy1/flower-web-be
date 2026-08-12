import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';

import { Product } from '../products/entities/product.entity';
import { ProductStatus } from '../products/enums/product-status.enum';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { Inventory } from './entities/inventory.entity';
import { CheckInventoriesDto } from './dto/check-inventories.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import {
  InventoryItemResponse,
  PaginatedInventoryResponse,
} from './interfaces/inventory-response.interface';

@Injectable()
export class InventoriesService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoriesRepository: Repository<Inventory>,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Tạo thông tin tồn kho cho sản phẩm.
   */
  async create(
    productId: string,
    createInventoryDto: CreateInventoryDto,
  ): Promise<Inventory> {
    await this.validateProduct(productId);

    const existingInventory = await this.inventoriesRepository.findOne({
      where: {
        productId,
      },
    });

    if (existingInventory) {
      throw new ConflictException('Sản phẩm đã có thông tin tồn kho');
    }

    const inventory = this.inventoriesRepository.create({
      productId,

      stockQuantity: createInventoryDto.stockQuantity ?? 0,

      reservedQuantity: 0,

      lowStockThreshold: createInventoryDto.lowStockThreshold ?? 5,

      isStockManaged: createInventoryDto.isStockManaged ?? true,
    });

    return this.inventoriesRepository.save(inventory);
  }

  /**
   * Lấy thông tin tồn kho theo sản phẩm.
   */
  async findByProduct(productId: string): Promise<Inventory> {
    await this.validateProduct(productId);

    const inventory = await this.inventoriesRepository.findOne({
      where: {
        productId,
      },
    });

    if (!inventory) {
      throw new NotFoundException('Sản phẩm chưa có thông tin tồn kho');
    }

    return inventory;
  }

  async findPublicByProduct(productId: string): Promise<Inventory> {
    await this.validateProduct(productId, true);

    return this.findByProduct(productId);
  }

  /**
   * Cập nhật tồn kho.
   */
  async update(
    productId: string,
    updateInventoryDto: UpdateInventoryDto,
  ): Promise<Inventory> {
    const inventory = await this.findByProduct(productId);

    if (
      updateInventoryDto.stockQuantity !== undefined &&
      updateInventoryDto.stockQuantity < inventory.reservedQuantity
    ) {
      throw new ConflictException(
        `Không thể đặt số lượng kho nhỏ hơn số lượng đang được giữ (${inventory.reservedQuantity})`,
      );
    }

    if (updateInventoryDto.stockQuantity !== undefined) {
      inventory.stockQuantity = updateInventoryDto.stockQuantity;
    }

    if (updateInventoryDto.lowStockThreshold !== undefined) {
      inventory.lowStockThreshold = updateInventoryDto.lowStockThreshold;
    }

    if (updateInventoryDto.isStockManaged !== undefined) {
      inventory.isStockManaged = updateInventoryDto.isStockManaged;
    }

    return this.inventoriesRepository.save(inventory);
  }

  /**
   * Nhập thêm hàng vào kho.
   */
  async increase(productId: string, quantity: number): Promise<Inventory> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Inventory);

      const inventory = await repository.findOne({
        where: {
          productId,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!inventory) {
        throw new NotFoundException('Sản phẩm chưa có thông tin tồn kho');
      }

      inventory.stockQuantity += quantity;

      return repository.save(inventory);
    });
  }

  /**
   * Giảm số lượng kho.
   *
   * Chỉ được giảm trong phạm vi số lượng
   * hiện có thể sử dụng.
   */
  async decrease(productId: string, quantity: number): Promise<Inventory> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Inventory);

      const inventory = await repository.findOne({
        where: {
          productId,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!inventory) {
        throw new NotFoundException('Sản phẩm chưa có thông tin tồn kho');
      }

      if (!inventory.isStockManaged) {
        throw new ConflictException(
          'Sản phẩm này không sử dụng chức năng quản lý tồn kho',
        );
      }

      const availableQuantity =
        inventory.stockQuantity - inventory.reservedQuantity;

      if (quantity > availableQuantity) {
        throw new ConflictException(
          `Không đủ tồn kho. Số lượng có thể giảm: ${availableQuantity}`,
        );
      }

      inventory.stockQuantity -= quantity;

      return repository.save(inventory);
    });
  }

  /**
   * Giữ hàng khi khách bắt đầu đặt hàng.
   *
   * Ví dụ:
   * stockQuantity = 10
   * reservedQuantity = 3
   * availableQuantity = 7
   */
  async reserve(productId: string, quantity: number): Promise<Inventory> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Inventory);

      const inventory = await repository.findOne({
        where: {
          productId,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!inventory) {
        throw new NotFoundException('Sản phẩm chưa có thông tin tồn kho');
      }

      if (!inventory.isStockManaged) {
        return inventory;
      }

      const availableQuantity =
        inventory.stockQuantity - inventory.reservedQuantity;

      if (quantity > availableQuantity) {
        throw new ConflictException(
          `Không đủ hàng. Số lượng hiện có thể đặt: ${availableQuantity}`,
        );
      }

      inventory.reservedQuantity += quantity;

      return repository.save(inventory);
    });
  }

  /**
   * Giải phóng số lượng đã giữ.
   *
   * Dùng khi đơn hàng bị hủy hoặc hết
   * thời gian thanh toán.
   */
  async release(productId: string, quantity: number): Promise<Inventory> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Inventory);

      const inventory = await repository.findOne({
        where: {
          productId,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!inventory) {
        throw new NotFoundException('Sản phẩm chưa có thông tin tồn kho');
      }

      if (!inventory.isStockManaged) {
        return inventory;
      }

      if (quantity > inventory.reservedQuantity) {
        throw new ConflictException(
          `Số lượng giải phóng không được lớn hơn số lượng đang giữ (${inventory.reservedQuantity})`,
        );
      }

      inventory.reservedQuantity -= quantity;

      return repository.save(inventory);
    });
  }

  /**
   * Xác nhận bán hàng.
   *
   * Khi đơn hàng thanh toán thành công:
   * - giảm stockQuantity
   * - giảm reservedQuantity
   */
  async commitReservedStock(
    productId: string,
    quantity: number,
  ): Promise<Inventory> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Inventory);

      const inventory = await repository.findOne({
        where: {
          productId,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!inventory) {
        throw new NotFoundException('Sản phẩm chưa có thông tin tồn kho');
      }

      if (!inventory.isStockManaged) {
        return inventory;
      }

      if (quantity > inventory.reservedQuantity) {
        throw new ConflictException(
          `Số lượng xác nhận không được lớn hơn số lượng đang giữ (${inventory.reservedQuantity})`,
        );
      }

      if (quantity > inventory.stockQuantity) {
        throw new ConflictException('Số lượng tồn kho không đủ');
      }

      inventory.stockQuantity -= quantity;

      inventory.reservedQuantity -= quantity;

      return repository.save(inventory);
    });
  }

  /**
   * Kiểm tra sản phẩm tồn tại và chưa bị xóa.
   */
  private async validateProduct(
    productId: string,
    requirePublicProduct = false,
  ): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: {
        id: productId,
        deletedAt: IsNull(),
      },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc đã bị xóa');
    }

    if (requirePublicProduct && product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException(
        'Sản phẩm không tồn tại hoặc chưa được công khai',
      );
    }

    return product;
  }

  async findAll(
    queryDto: InventoryQueryDto,
  ): Promise<PaginatedInventoryResponse> {
    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.inventoriesRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .where('product.deleted_at IS NULL');

    const keyword = queryDto.keyword?.trim();

    if (keyword) {
      queryBuilder.andWhere(
        `(
        product.name LIKE :keyword
        OR product.product_code LIKE :keyword
      )`,
        {
          keyword: `%${keyword}%`,
        },
      );
    }

    queryBuilder
      .orderBy('inventory.updated_at', 'DESC')
      .addOrderBy('inventory.id', 'DESC')
      .skip(skip)
      .take(limit);

    const [inventories, total] = await queryBuilder.getManyAndCount();

    return {
      data: inventories.map((inventory) => this.toInventoryResponse(inventory)),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findLowStock(): Promise<InventoryItemResponse[]> {
    const inventories = await this.inventoriesRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .where('inventory.is_stock_managed = :isStockManaged', {
        isStockManaged: true,
      })
      .andWhere(
        `(
          inventory.stock_quantity
          - inventory.reserved_quantity
        ) <= inventory.low_stock_threshold`,
      )
      .andWhere(
        `(
          inventory.stock_quantity
          - inventory.reserved_quantity
        ) > 0`,
      )
      .andWhere('product.deleted_at IS NULL')
      .orderBy(
        `(
          inventory.stock_quantity
          - inventory.reserved_quantity
        )`,
        'ASC',
      )
      .getMany();

    return inventories.map((inventory) => this.toInventoryResponse(inventory));
  }

  async findOutOfStock(): Promise<InventoryItemResponse[]> {
    const inventories = await this.inventoriesRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .where('inventory.is_stock_managed = :isStockManaged', {
        isStockManaged: true,
      })
      .andWhere(
        `(
          inventory.stock_quantity
          - inventory.reserved_quantity
        ) <= 0`,
      )
      .andWhere('product.deleted_at IS NULL')
      .orderBy('inventory.updated_at', 'DESC')
      .getMany();

    return inventories.map((inventory) => this.toInventoryResponse(inventory));
  }

  async checkInventories(
    checkInventoriesDto: CheckInventoriesDto,
  ): Promise<InventoryItemResponse[]> {
    const productIds = [...new Set(checkInventoriesDto.productIds)];

    const inventories = await this.inventoriesRepository.find({
      where: {
        productId: In(productIds),
      },
      relations: {
        product: true,
      },
    });

    const inventoryMap = new Map(
      inventories.map((inventory) => [inventory.productId, inventory]),
    );

    return productIds.map((productId) => {
      const inventory = inventoryMap.get(productId);

      if (!inventory) {
        return {
          id: '',
          productId,
          productCode: null,
          productName: null,
          stockQuantity: 0,
          reservedQuantity: 0,
          availableQuantity: 0,
          lowStockThreshold: 0,
          isStockManaged: true,
          isLowStock: true,
          isOutOfStock: true,
          createdAt: new Date(0),
          updatedAt: new Date(0),
        };
      }

      return this.toInventoryResponse(inventory);
    });
  }

  private toInventoryResponse(inventory: Inventory): InventoryItemResponse {
    const availableQuantity = inventory.isStockManaged
      ? Math.max(inventory.stockQuantity - inventory.reservedQuantity, 0)
      : Number.MAX_SAFE_INTEGER;

    const isOutOfStock = inventory.isStockManaged && availableQuantity <= 0;

    const isLowStock =
      inventory.isStockManaged &&
      availableQuantity > 0 &&
      availableQuantity <= inventory.lowStockThreshold;

    return {
      id: inventory.id,
      productId: inventory.productId,

      productCode: inventory.product?.productCode ?? null,

      productName: inventory.product?.name ?? null,

      stockQuantity: inventory.stockQuantity,

      reservedQuantity: inventory.reservedQuantity,

      availableQuantity,

      lowStockThreshold: inventory.lowStockThreshold,

      isStockManaged: inventory.isStockManaged,

      isLowStock,
      isOutOfStock,

      createdAt: inventory.createdAt,

      updatedAt: inventory.updatedAt,
    };
  }
}
