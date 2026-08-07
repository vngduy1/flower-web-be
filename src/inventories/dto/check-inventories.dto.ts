import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class CheckInventoriesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({
    each: true,
  })
  productIds: string[];
}
