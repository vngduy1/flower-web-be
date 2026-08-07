import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  addressId!: string;

  @IsDateString()
  deliveryDate!: string;

  @IsString()
  @IsNotEmpty()
  timeSlotId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  couponCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
