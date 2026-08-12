import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { CouponDiscountType } from '../enums/coupon-discount-type.enum';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(CouponDiscountType)
  discountType!: CouponDiscountType;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  discountValue!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumOrderAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maximumDiscountAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
