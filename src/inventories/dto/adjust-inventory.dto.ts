import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { InventoryChangeType } from '../enums/inventory-change-type.enum';

export class AdjustInventoryDto {
  @IsEnum(InventoryChangeType)
  changeType!: InventoryChangeType;

  /**
   * IMPORT, MANUAL_INCREASE, MANUAL_DECREASE:
   * quantity là số lượng thay đổi.
   *
   * ADJUSTMENT:
   * quantity là số tồn kho cuối cùng muốn đặt.
   */
  @IsInt()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason?: string;
}
