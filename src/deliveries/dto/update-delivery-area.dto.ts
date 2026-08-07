import { PartialType } from '@nestjs/mapped-types';

import { CreateDeliveryAreaDto } from './create-delivery-area.dto';

export class UpdateDeliveryAreaDto extends PartialType(CreateDeliveryAreaDto) {}
