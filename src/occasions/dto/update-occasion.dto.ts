import { PartialType } from '@nestjs/mapped-types';

import { CreateOccasionDto } from './create-occasion.dto';

export class UpdateOccasionDto extends PartialType(CreateOccasionDto) {}
