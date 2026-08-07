import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { RoleCode } from '../auth/enums/role-code.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

import { AdminUsersService } from './admin-users.service';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  findAll(@Query() query: AdminUserQueryDto) {
    return this.adminUsersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminUsersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.adminUsersService.create(dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminUsersService.updateStatus(request.user.id, id, dto);
  }

  @Patch(':id/role')
  updateRole(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminUsersService.updateRole(request.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.adminUsersService.remove(request.user.id, id);
  }

  @Patch(':id/restore')
  restore(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.adminUsersService.restore(request.user.id, id);
  }
}
