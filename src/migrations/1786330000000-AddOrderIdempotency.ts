import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddOrderIdempotency1786330000000 implements MigrationInterface {
  name = 'AddOrderIdempotency1786330000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const initialTable = await queryRunner.getTable('orders');

    if (!initialTable) {
      throw new Error('orders table does not exist');
    }

    if (!initialTable.findColumnByName('idempotency_key')) {
      await queryRunner.addColumn(
        'orders',
        new TableColumn({
          name: 'idempotency_key',
          type: 'varchar',
          length: '128',
          isNullable: true,
        }),
      );
    }

    if (!initialTable.findColumnByName('idempotency_fingerprint')) {
      await queryRunner.addColumn(
        'orders',
        new TableColumn({
          name: 'idempotency_fingerprint',
          type: 'char',
          length: '64',
          isNullable: true,
        }),
      );
    }

    const updatedTable = await queryRunner.getTable('orders');

    if (
      updatedTable &&
      !updatedTable.indices.some(
        (index) => index.name === 'uq_orders_user_idempotency_key',
      )
    ) {
      await queryRunner.createIndex(
        'orders',
        new TableIndex({
          name: 'uq_orders_user_idempotency_key',
          columnNames: ['user_id', 'idempotency_key'],
          isUnique: true,
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('orders');

    if (!table) {
      return;
    }

    if (
      table.indices.some(
        (index) => index.name === 'uq_orders_user_idempotency_key',
      )
    ) {
      await queryRunner.dropIndex('orders', 'uq_orders_user_idempotency_key');
    }

    if (table.findColumnByName('idempotency_fingerprint')) {
      await queryRunner.dropColumn('orders', 'idempotency_fingerprint');
    }

    if (table.findColumnByName('idempotency_key')) {
      await queryRunner.dropColumn('orders', 'idempotency_key');
    }
  }
}
