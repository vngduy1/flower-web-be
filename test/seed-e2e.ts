import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { RoleCode } from '../src/auth/enums/role-code.enum';
import { Role } from '../src/roles/entities/role.entity';
import { User } from '../src/users/entities/user.entity';
import { UserStatus } from '../src/users/enums/user-status.enum';

const logger = new Logger('E2ESeed');
const TEST_DATABASE_PATTERN = /(?:^|[_-])(e2e|test)(?:$|[_-])/i;

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function assertSafeResetTarget(): void {
  const database = requiredEnvironment('DB_DATABASE');

  if (
    process.env.NODE_ENV !== 'test' ||
    process.env.DEPLOYMENT_ENV !== 'test' ||
    process.env.E2E_ALLOW_RESET !== 'true' ||
    process.env.DB_DROP_SCHEMA !== 'true' ||
    process.env.DB_SYNCHRONIZE !== 'true' ||
    !TEST_DATABASE_PATTERN.test(database)
  ) {
    throw new Error(
      'E2E reset refused: use the test environment, explicit reset flags, and a database name containing test or e2e',
    );
  }
}

async function seed(): Promise<void> {
  assertSafeResetTarget();

  const email = requiredEnvironment('E2E_ADMIN_EMAIL').toLowerCase();
  const password = requiredEnvironment('E2E_ADMIN_PASSWORD');

  if (email.length > 255 || !email.includes('@')) {
    throw new Error('E2E_ADMIN_EMAIL must be a valid email address');
  }

  if (password.length < 8 || password.length > 72) {
    throw new Error(
      'E2E_ADMIN_PASSWORD must contain between 8 and 72 characters',
    );
  }

  const application = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const rolesRepository = application.get<Repository<Role>>(
      getRepositoryToken(Role),
    );
    const usersRepository = application.get<Repository<User>>(
      getRepositoryToken(User),
    );
    const roles = [
      { roleCode: RoleCode.ADMIN, roleName: 'Administrator' },
      { roleCode: RoleCode.STAFF, roleName: 'Staff' },
      { roleCode: RoleCode.CUSTOMER, roleName: 'Customer' },
    ];

    const savedRoles = await rolesRepository.save(
      roles.map((role) => rolesRepository.create({ ...role, isActive: true })),
    );
    const adminRole = savedRoles.find(
      (role) => role.roleCode === String(RoleCode.ADMIN),
    );

    if (!adminRole) {
      throw new Error('Unable to seed the ADMIN role');
    }

    await usersRepository.save(
      usersRepository.create({
        roleId: adminRole.id,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        fullName: 'E2E Administrator',
        phone: null,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      }),
    );

    logger.log(
      JSON.stringify({
        event: 'e2e_database_seeded',
        roles: roles.length,
        users: 1,
      }),
    );
  } finally {
    await application.close();
  }
}

void seed().catch((error: unknown) => {
  logger.error(
    JSON.stringify({
      event: 'e2e_database_seed_failed',
      errorType: error instanceof Error ? error.name : 'UnknownError',
    }),
  );
  process.exitCode = 1;
});
