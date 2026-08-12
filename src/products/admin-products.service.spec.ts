/* eslint-disable @typescript-eslint/unbound-method */
import { DataSource, Repository } from 'typeorm';

import { Inventory } from '../inventories/entities/inventory.entity';
import { ProductImage } from '../product-images/entities/product-image.entity';

import { AdminProductsService } from './admin-products.service';
import { Product } from './entities/product.entity';
import { ProductStatus } from './enums/product-status.enum';

describe('AdminProductsService', () => {
  it('hydrates inventory and the primary image through mapped relations', async () => {
    const inventory = {
      stockQuantity: 12,
      reservedQuantity: 2,
      lowStockThreshold: 5,
      isStockManaged: true,
    } as Inventory;

    const primaryImage = {
      id: '7',
      imageUrl: '/image.webp',
      thumbnailUrl: '/thumb.webp',
      isPrimary: true,
      sortOrder: 0,
      deletedAt: null,
    } as ProductImage;

    const product = {
      id: '3',
      productCode: 'P-3',
      name: 'Rose',
      slug: 'rose',
      category: {
        id: '1',
        name: 'Flowers',
        slug: 'flowers',
      },
      basePrice: '1000',
      salePrice: null,
      status: ProductStatus.ACTIVE,
      isFeatured: false,
      inventory,
      images: [primaryImage],
      availableFrom: null,
      availableUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Product;

    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),

      // findAll() hiện đang sử dụng các method này
      andWhere: jest.fn().mockReturnThis(),
      withDeleted: jest.fn().mockReturnThis(),

      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),

      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),

      getManyAndCount: jest.fn().mockResolvedValue([[product], 1]),
    };

    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<Product>;

    const dataSource = {
      getRepository: jest.fn().mockReturnValue(repository),
    } as unknown as DataSource;

    const service = new AdminProductsService(dataSource);

    const result = await service.findAll({} as never);

    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'product.inventory',
      'inventory',
    );

    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'product.images',
      'image',
      'image.isPrimary = :isPrimary',
      { isPrimary: true },
    );

    expect(result.items[0]).toMatchObject({
      thumbnailUrl: '/thumb.webp',
      inventory: {
        stockQuantity: 12,
        reservedQuantity: 2,
        availableQuantity: 10,
      },
    });
  });

  it('returns a complete admin-only product detail contract', async () => {
    const product = {
      id: '3',
      productCode: 'P-3',
      name: 'Rose',
      slug: 'rose',
      categoryId: '1',
      category: { id: '1', name: 'Flowers', slug: 'flowers' },
      description: 'Admin description',
      basePrice: '1000',
      salePrice: null,
      status: ProductStatus.DRAFT,
      isFeatured: false,
      inventory: null,
      images: [],
      availableFrom: null,
      availableUntil: null,
      preparationDays: 2,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Product;
    const repository = {
      findOne: jest.fn().mockResolvedValue(product),
    } as unknown as Repository<Product>;
    const service = new AdminProductsService({
      getRepository: jest.fn().mockReturnValue(repository),
    } as unknown as DataSource);

    const result = await service.findOne('3');

    expect(result.product).toMatchObject({
      id: '3',
      status: ProductStatus.DRAFT,
      description: 'Admin description',
      preparationDays: 2,
    });
    expect(repository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: { category: true, images: true, inventory: true },
      }),
    );
  });
});
