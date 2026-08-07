import { IsNotEmpty, IsNumberString } from 'class-validator';

export class WishlistProductParamDto {
  @IsNumberString()
  @IsNotEmpty()
  productId!: string;
}
