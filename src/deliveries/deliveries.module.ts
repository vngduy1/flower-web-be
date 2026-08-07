import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminDeliveryAreasController } from './admin-delivery-areas.controller';
import { AdminDeliveryBlackoutDatesController } from './admin-delivery-blackout-dates.controller';
import { AdminDeliveryCapacitiesController } from './admin-delivery-capacities.controller';
import { AdminDeliveryTimeSlotsController } from './admin-delivery-time-slots.controller';
import { DeliveryController } from './delivery.controller';

import { DeliveryAreasService } from './delivery-areas.service';
import { DeliveryAvailabilityService } from './delivery-availability.service';
import { DeliveryBlackoutDatesService } from './delivery-blackout-dates.service';
import { DeliveryCapacitiesService } from './delivery-capacities.service';
import { DeliveryTimeSlotsService } from './delivery-time-slots.service';

import { DeliveryArea } from './entities/delivery-area.entity';
import { DeliveryBlackoutDate } from './entities/delivery-blackout-date.entity';
import { DeliveryCapacity } from './entities/delivery-capacity.entity';
import { DeliveryTimeSlot } from './entities/delivery-time-slot.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryArea,
      DeliveryBlackoutDate,
      DeliveryCapacity,
      DeliveryTimeSlot,
    ]),
  ],

  controllers: [
    AdminDeliveryAreasController,
    AdminDeliveryBlackoutDatesController,
    AdminDeliveryCapacitiesController,
    AdminDeliveryTimeSlotsController,

    DeliveryController,
  ],

  providers: [
    DeliveryAreasService,
    DeliveryBlackoutDatesService,
    DeliveryCapacitiesService,
    DeliveryTimeSlotsService,

    DeliveryAvailabilityService,
  ],

  exports: [
    DeliveryAreasService,
    DeliveryBlackoutDatesService,
    DeliveryCapacitiesService,
    DeliveryTimeSlotsService,

    DeliveryAvailabilityService,
  ],
})
export class DeliveriesModule {}
