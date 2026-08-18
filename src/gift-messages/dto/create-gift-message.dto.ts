import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

import { GiftCardType } from '../enums/gift-card-type.enum';

export class CreateGiftMessageDto {
  @IsEnum(GiftCardType)
  cardType!: GiftCardType;

  @IsString()
  @Length(1, 500)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  senderName?: string;
}
