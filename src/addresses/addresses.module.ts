import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';
import { UserAddress } from './entities/user-address.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserAddress, User])],
  controllers: [AddressesController],
  providers: [AddressesService],
  exports: [AddressesService],
})
export class AddressesModule {}
