import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateDeliveryCapacityDto {
  @IsDateString()
  deliveryDate!: string;

  @IsString()
  @IsNotEmpty()
  timeSlotId!: string;

  @IsInt()
  @Min(1)
  @Max(10000)
  maxOrders!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
