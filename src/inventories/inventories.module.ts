import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';

import { AdminInventoriesController } from './admin-inventories.controller';
import { AdminInventoriesService } from './admin-inventories.service';
import { InventoryHistory } from './entities/inventory-history.entity';
import { Inventory } from './entities/inventory.entity';
import { InventoriesController } from './inventories.controller';
import { InventoriesService } from './inventories.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory, InventoryHistory, Product, User]),
  ],
  controllers: [InventoriesController, AdminInventoriesController],
  providers: [InventoriesService, AdminInventoriesService],
  exports: [InventoriesService, AdminInventoriesService],
})
export class InventoriesModule {}
