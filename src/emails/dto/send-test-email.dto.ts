import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendTestEmailDto {
  @IsEmail()
  @MaxLength(255)
  to!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName!: string;
}
