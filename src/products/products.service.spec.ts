import { NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, FindOneOptions, Repository } from 'typeorm';

import { Category } from '../categories/entities/category.entity';
import { Inventory } from '../inventories/entities/inventory.entity';

import { Product } from './entities/product.entity';
import { ProductStatus } from './enums/product-status.enum';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  it('requires ACTIVE status for public product detail', async () => {
    let findOptions: FindOneOptions<Product> | undefined;
    const productsRepository = {
      findOne: jest
        .fn()
        .mockImplementation((options: FindOneOptions<Product>) => {
          findOptions = options;
          return Promise.resolve(null);
        }),
    } as unknown as Repository<Product>;
    const service = new ProductsService(
      productsRepository,
      {} as Repository<Category>,
      {} as DataSource,
    );

    await expect(service.findOne('12')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    const where = Array.isArray(findOptions?.where)
      ? undefined
      : findOptions?.where;
    expect(where?.id).toBe('12');
    expect(where?.status).toBe(ProductStatus.ACTIVE);
    expect(where?.deletedAt).toBeDefined();
  });

  it('always applies ACTIVE status to the public product list', async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const productsRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<Product>;
    const service = new ProductsService(
      productsRepository,
      {} as Repository<Category>,
      {} as DataSource,
    );

    await service.findAll({ status: ProductStatus.DRAFT } as never);

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'product.status = :publicStatus',
      { publicStatus: ProductStatus.ACTIVE },
    );
  });

  it('uses the entity/database low-stock default for new inventory', async () => {
    const product = {
      id: '31',
      productCode: 'P-31',
      slug: 'product-31',
      categoryId: '4',
      category: { id: '4' },
      status: ProductStatus.DRAFT,
      deletedAt: null,
    } as Product;
    const productsRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(product),
    } as unknown as Repository<Product>;
    const categoriesRepository = {
      findOne: jest.fn().mockResolvedValue({ id: '4', isActive: true }),
    } as unknown as Repository<Category>;
    const transactionProductRepository = {
      create: jest.fn().mockReturnValue(product),
      save: jest.fn().mockResolvedValue(product),
    };
    const transactionInventoryRepository = {
      create: jest.fn().mockImplementation((value: Inventory) => value),
      save: jest.fn().mockImplementation((value: Inventory) => value),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === Product
          ? transactionProductRepository
          : transactionInventoryRepository,
      ),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(
        (callback: (entityManager: EntityManager) => Promise<string>) =>
          callback(manager),
      ),
    } as unknown as DataSource;
    const service = new ProductsService(
      productsRepository,
      categoriesRepository,
      dataSource,
    );

    await service.create({
      productCode: 'P-31',
      name: 'Product 31',
      slug: 'product-31',
      categoryId: '4',
      basePrice: '1000',
    });

    expect(transactionInventoryRepository.create).toHaveBeenCalledWith({
      productId: '31',
      stockQuantity: 0,
      reservedQuantity: 0,
      isStockManaged: true,
    });
  });
});
