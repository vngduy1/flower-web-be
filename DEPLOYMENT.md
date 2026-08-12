# Backend deployment

The NestJS API is a separate service from the Next.js frontend. Production traffic should
reach the frontend/reverse proxy first; `/api` and `/uploads` are then proxied to this
service.

## Required environment

Copy `.env.example` to a secret-managed runtime environment. Staging and production must
use unique database credentials and JWT secrets. `DB_SYNCHRONIZE` and `DB_DROP_SCHEMA`
must remain `false` outside the isolated E2E reset command.

The service exposes:

- `GET /api/health/live` for process liveness
- `GET /api/health/ready` for database-aware readiness

Neither response includes environment or database diagnostics.

## Commands

```text
npm ci
npm run format:check
npx eslint "src/common/**/*.ts" src/app.module.ts src/main.ts test/seed-e2e.ts --max-warnings=0
npm run typecheck
npm test -- --runInBand
npm run build
npm run start:prod
```

For a disposable test database only:

```text
NODE_ENV=test
DEPLOYMENT_ENV=test
DB_SYNCHRONIZE=true
DB_DROP_SCHEMA=true
E2E_ALLOW_RESET=true
npm run seed:e2e
```

The seed command refuses other environments and database names that do not contain
`test` or `e2e`. It resets the schema from verified TypeORM entities, seeds the three
roles, and creates the ADMIN bootstrap account from `E2E_ADMIN_EMAIL` and
`E2E_ADMIN_PASSWORD`. The Playwright suite creates and deletes disposable STAFF and
CUSTOMER accounts through the real API.

## Migration limitation

There is no checked-in TypeORM migration baseline. Schema synchronization is therefore
permitted only for local development and isolated E2E databases. Do not deploy a fresh
staging or production database until an initial migration has been generated, reviewed
against a sanitized schema, tested forward and backward, and committed. Rollback is
currently application-image rollback plus database restore; schema rollback is not yet
supported.

## Container operation

The Dockerfile builds the Nest application in one stage and runs only production
dependencies as the non-root `node` user. Mount durable storage at `/app/uploads` when
product images must survive replacement. Send `SIGTERM` for shutdown; Nest shutdown
hooks close the TypeORM connection and stop accepting new work before exit.
