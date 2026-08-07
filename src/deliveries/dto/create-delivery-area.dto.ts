import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDeliveryAreaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  prefecture!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  areaName!: string;

  @IsNumber()
  @Min(0)
  @Max(1000000)
  deliveryFee!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
