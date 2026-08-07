import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import { InventoryChangeType } from '../enums/inventory-change-type.enum';

export class InventoryHistoryQueryDto {
  @IsOptional()
  @IsEnum(InventoryChangeType)
  changeType?: InventoryChangeType;

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
