import { IsEnum } from 'class-validator';

import { RoleCode } from '../../auth/enums/role-code.enum';

export class UpdateUserRoleDto {
  @IsEnum(RoleCode)
  roleCode!: RoleCode;
}
