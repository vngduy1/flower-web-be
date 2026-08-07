import { PartialType } from '@nestjs/mapped-types';

import { CreateDeliveryCapacityDto } from './create-delivery-capacity.dto';

export class UpdateDeliveryCapacityDto extends PartialType(
  CreateDeliveryCapacityDto,
) {}
