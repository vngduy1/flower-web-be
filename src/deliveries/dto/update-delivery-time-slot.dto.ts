import { PartialType } from '@nestjs/mapped-types';

import { CreateDeliveryTimeSlotDto } from './create-delivery-time-slot.dto';

export class UpdateDeliveryTimeSlotDto extends PartialType(
  CreateDeliveryTimeSlotDto,
) {}
