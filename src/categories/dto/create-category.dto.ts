import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateCategoryDto {
  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  @Length(1, 100)
  name: string;

  @IsString()
  @Length(1, 120)
  slug: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
