import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateInventoryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999999999)
  stockQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999999999)
  lowStockThreshold?: number;

  @IsOptional()
  @IsBoolean()
  isStockManaged?: boolean;
}
