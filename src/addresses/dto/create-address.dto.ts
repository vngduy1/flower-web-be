import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function trimOptionalString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue === '' ? undefined : trimmedValue;
}

export class CreateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }: { value: unknown }) => trimOptionalString(value))
  label?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => trimString(value))
  recipientName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'recipientPhone không đúng định dạng',
  })
  @Transform(({ value }: { value: unknown }) => trimString(value))
  recipientPhone: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{3}-?\d{4}$/, {
    message: 'postalCode phải có định dạng 1234567 hoặc 123-4567',
  })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }

    return value.trim().replace('-', '');
  })
  postalCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Transform(({ value }: { value: unknown }) => trimString(value))
  prefecture: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => trimString(value))
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }: { value: unknown }) => trimString(value))
  addressLine1: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }: { value: unknown }) => trimOptionalString(value))
  addressLine2?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
