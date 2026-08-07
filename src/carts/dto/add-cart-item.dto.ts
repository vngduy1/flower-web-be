import { IsInt, IsString, Max, Min } from 'class-validator';

export class AddCartItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(999)
  quantity: number;
}
