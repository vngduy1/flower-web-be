import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    return value.trim();
  })
  label?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  recipientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'recipientPhone không đúng định dạng',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  recipientPhone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{3}-?\d{4}$/, {
    message: 'postalCode phải có định dạng 1234567 hoặc 123-4567',
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    return value.trim().replace('-', '');
  })
  postalCode?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  prefecture?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  city?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    return value.trim();
  })
  addressLine2?: string;
}
