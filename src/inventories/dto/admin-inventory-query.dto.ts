import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminInventoryQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsIn(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'NOT_MANAGED'])
  stockStatus?:
    'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NOT_MANAGED';

  @IsOptional()
  @IsIn(['productName', 'stockQuantity', 'availableQuantity', 'updatedAt'])
  sortBy: 'productName' | 'stockQuantity' | 'availableQuantity' | 'updatedAt' =
    'updatedAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
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
