import {
  IsBoolean,
  IsDateString,
  IsDecimal,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { ProductStatus } from '../enums/product-status.enum';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  productCode: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 220)
  slug: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsDecimal({
    decimal_digits: '0,2',
    force_decimal: false,
  })
  basePrice: string;

  @IsOptional()
  @IsDecimal({
    decimal_digits: '0,2',
    force_decimal: false,
  })
  salePrice?: string;

  @IsOptional()
  @IsDecimal({
    decimal_digits: '0,2',
    force_decimal: false,
  })
  costPrice?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @IsOptional()
  @IsDateString()
  availableUntil?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  preparationDays?: number;
}
