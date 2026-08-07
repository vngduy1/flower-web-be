import { UserStatus } from '../../users/enums/user-status.enum';
import { RoleCode } from '../enums/role-code.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: UserStatus;
  roleCode: RoleCode;
  roleName: string;
}
