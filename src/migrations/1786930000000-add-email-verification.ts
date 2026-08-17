import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmailVerification1786930000000 implements MigrationInterface {
  name = 'AddEmailVerification1786930000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');

    if (!table) {
      throw new Error('users table does not exist');
    }

    if (!table.findColumnByName('email_verification_code')) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'email_verification_code',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
    }

    if (!table.findColumnByName('email_verification_expires_at')) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'email_verification_expires_at',
          type: 'datetime',
          isNullable: true,
        }),
      );
    }

    if (!table.findColumnByName('email_verified_at')) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'email_verified_at',
          type: 'datetime',
          isNullable: true,
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');

    if (!table) {
      return;
    }

    if (table.findColumnByName('email_verified_at')) {
      await queryRunner.dropColumn('users', 'email_verified_at');
    }

    if (table.findColumnByName('email_verification_expires_at')) {
      await queryRunner.dropColumn('users', 'email_verification_expires_at');
    }

    if (table.findColumnByName('email_verification_code')) {
      await queryRunner.dropColumn('users', 'email_verification_code');
    }
  }
}
