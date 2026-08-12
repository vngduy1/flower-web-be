/* eslint-disable @typescript-eslint/unbound-method */
import { NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Product } from '../products/entities/product.entity';
import { ProductStatus } from '../products/enums/product-status.enum';

import { Inventory } from './entities/inventory.entity';
import { InventoriesService } from './inventories.service';

describe('InventoriesService', () => {
  it('does not expose inventory for a non-public product', async () => {
    const inventoryRepository = {
      findOne: jest.fn(),
    } as unknown as Repository<Inventory>;
    const productRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: '11',
        status: ProductStatus.INACTIVE,
        deletedAt: null,
      }),
    } as unknown as Repository<Product>;
    const service = new InventoriesService(
      inventoryRepository,
      productRepository,
      {} as DataSource,
    );

    await expect(service.findPublicByProduct('11')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(inventoryRepository.findOne).not.toHaveBeenCalled();
  });
});
