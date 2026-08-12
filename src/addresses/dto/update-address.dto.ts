import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }: { value: unknown }) => trimString(value))
  label?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => trimString(value))
  recipientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'recipientPhone không đúng định dạng',
  })
  @Transform(({ value }: { value: unknown }) => trimString(value))
  recipientPhone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{3}-?\d{4}$/, {
    message: 'postalCode phải có định dạng 1234567 hoặc 123-4567',
  })
  @Transform(({ value }: { value: unknown }) => {
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
  @Transform(({ value }: { value: unknown }) => trimString(value))
  prefecture?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => trimString(value))
  city?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }: { value: unknown }) => trimString(value))
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }: { value: unknown }) => trimString(value))
  addressLine2?: string;
}
