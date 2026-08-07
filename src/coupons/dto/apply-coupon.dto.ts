import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ApplyCouponDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;
}
