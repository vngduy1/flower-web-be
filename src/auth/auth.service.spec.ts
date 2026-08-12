import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmailsService } from '../emails/emails.service';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Role), useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: JwtService, useValue: {} },
        { provide: EmailsService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
