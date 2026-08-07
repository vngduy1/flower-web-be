import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export class CreateDeliveryBlackoutDateDto {
  @IsDateString()
  blackoutDate!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
