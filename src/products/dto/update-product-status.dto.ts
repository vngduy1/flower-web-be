import { IsEnum } from 'class-validator';

import { ProductStatus } from '../enums/product-status.enum';

export class UpdateProductStatusDto {
  @IsEnum(ProductStatus)
  status!: ProductStatus;
}
