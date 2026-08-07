import { IsEmail, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @IsString()
  @Length(8, 72, {
    message: 'Mật khẩu phải có từ 8 đến 72 ký tự',
  })
  password: string;
}
