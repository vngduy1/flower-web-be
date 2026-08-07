import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CheckoutPreviewDto {
  @IsString()
  @IsNotEmpty()
  addressId: string;

  @IsDateString()
  deliveryDate: string;

  @IsOptional()
  @IsString()
  deliveryTimeSlot?: string;
}
