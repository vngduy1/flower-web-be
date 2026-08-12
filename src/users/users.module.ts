import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../roles/entities/role.entity';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role])],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService, AdminUsersService],
  exports: [UsersService, AdminUsersService],
})
export class UsersModule {}
