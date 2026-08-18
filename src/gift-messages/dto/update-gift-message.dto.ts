import { PartialType } from '@nestjs/mapped-types';

import { CreateGiftMessageDto } from './create-gift-message.dto';

export class UpdateGiftMessageDto extends PartialType(CreateGiftMessageDto) {}
