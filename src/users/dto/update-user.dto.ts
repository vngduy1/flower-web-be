import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { UserStatus } from '../enums/user-status.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsEmail()
  @Length(5, 255)
  email?: string;

  @IsOptional()
  @IsString()
  @Length(8, 72)
  password?: string;

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

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
