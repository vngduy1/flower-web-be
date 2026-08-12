import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AppModule } from '../app.module';

async function migrate(): Promise<void> {
  const action = process.argv[2];

  if (action !== 'run' && action !== 'revert') {
    throw new Error('Migration action must be "run" or "revert"');
  }

  const application = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = application.get(DataSource);

    if (action === 'run') {
      const migrations = await dataSource.runMigrations({
        transaction: 'each',
      });
      Logger.log(`Applied ${migrations.length} migration(s)`, 'Migration');
    } else {
      await dataSource.undoLastMigration({ transaction: 'each' });
      Logger.log('Reverted the last migration', 'Migration');
    }
  } finally {
    await application.close();
  }
}

void migrate().catch((error: unknown) => {
  Logger.error(
    error instanceof Error ? error.message : String(error),
    undefined,
    'Migration',
  );
  process.exitCode = 1;
});
