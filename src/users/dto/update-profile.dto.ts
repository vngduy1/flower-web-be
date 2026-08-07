import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @Length(8, 20)
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'Số điện thoại không đúng định dạng',
  })
  phone?: string;
}
