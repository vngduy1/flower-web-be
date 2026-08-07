import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateInventorySettingsDto {
  @IsOptional()
  @IsBoolean()
  isStockManaged?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}
