import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminOccasionsController } from './admin-occasions.controller';
import { Occasion } from './entities/occasion.entity';
import { OccasionsController } from './occasions.controller';
import { OccasionsService } from './occasions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Occasion])],
  controllers: [OccasionsController, AdminOccasionsController],
  providers: [OccasionsService],
  exports: [OccasionsService],
})
export class OccasionsModule {}
