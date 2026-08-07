import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @Length(2, 50)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'roleCode chỉ được chứa chữ in hoa, số và dấu gạch dưới',
  })
  roleCode: string;

  @IsString()
  @Length(2, 100)
  roleName: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
