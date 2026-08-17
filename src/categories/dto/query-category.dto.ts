import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryCategoryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Transform(({ value }: TransformFnParams) => {
    if (value === 'true') return true;
    if (value === 'false') return false;

    return value as unknown;
  })
  @IsBoolean()
  deletedOnly?: boolean;

  @IsOptional()
  @Transform(({ value }: TransformFnParams) => {
    if (value === 'true') return true;
    if (value === 'false') return false;

    return value as unknown;
  })
  @IsBoolean()
  hasActiveProducts?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
