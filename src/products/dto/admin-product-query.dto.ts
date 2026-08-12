import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class AdminProductQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  deletedOnly?: boolean;

  @IsOptional()
  @IsIn(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'])
  stockStatus?: 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

  @IsOptional()
  @IsIn([
    'createdAt',
    'updatedAt',
    'name',
    'basePrice',
    'salePrice',
    'stockQuantity',
  ])
  sortBy:
    | 'createdAt'
    | 'updatedAt'
    | 'name'
    | 'basePrice'
    | 'salePrice'
    | 'stockQuantity' = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
