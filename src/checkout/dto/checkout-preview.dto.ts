import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { CreateGiftMessageDto } from '../../gift-messages/dto/create-gift-message.dto';

export class CheckoutPreviewDto {
  @IsString()
  @IsNotEmpty()
  addressId!: string;

  @IsDateString()
  deliveryDate!: string;

  @IsOptional()
  @IsString()
  deliveryTimeSlot?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateGiftMessageDto)
  giftMessage?: CreateGiftMessageDto;
}
