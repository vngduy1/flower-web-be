import { PartialType } from '@nestjs/mapped-types';

import { CreateDeliveryBlackoutDateDto } from './create-delivery-blackout-date.dto';

export class UpdateDeliveryBlackoutDateDto extends PartialType(
  CreateDeliveryBlackoutDateDto,
) {}
