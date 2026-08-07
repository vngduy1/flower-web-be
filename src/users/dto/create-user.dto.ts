import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

import { RoleCode } from '../../auth/enums/role-code.enum';
import { UserStatus } from '../enums/user-status.enum';

export class CreateUserDto {
  @IsEnum(RoleCode)
  roleCode!: RoleCode;

  @IsEmail()
  @Length(5, 255)
  email!: string;

  @IsString()
  @Length(8, 72)
  password!: string;

  @IsString()
  @Length(1, 100)
  fullName!: string;

  @IsOptional()
  @IsString()
  @Length(8, 20)
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'Số điện thoại không đúng định dạng',
  })
  phone?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status: UserStatus = UserStatus.ACTIVE;
}
