import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmedValue = value.trim();

    return trimmedValue === '' ? undefined : trimmedValue;
  })
  label?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  recipientName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'recipientPhone không đúng định dạng',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  recipientPhone: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{3}-?\d{4}$/, {
    message: 'postalCode phải có định dạng 1234567 hoặc 123-4567',
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    return value.trim().replace('-', '');
  })
  postalCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  prefecture: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  addressLine1: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmedValue = value.trim();

    return trimmedValue === '' ? undefined : trimmedValue;
  })
  addressLine2?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
