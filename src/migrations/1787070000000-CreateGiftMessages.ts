import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateGiftMessages1787070000000 implements MigrationInterface {
  name = 'CreateGiftMessages1787070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'gift_messages',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            unsigned: true,
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'order_id',
            type: 'bigint',
            unsigned: true,
            isNullable: false,
          },
          {
            name: 'card_type',
            type: 'enum',
            enum: [
              'STANDARD',
              'BIRTHDAY',
              'CONGRATULATIONS',
              'THANK_YOU',
              'CONDOLENCE',
            ],
            isNullable: false,
          },
          {
            name: 'message',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'sender_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'gift_messages',
      new TableIndex({
        name: 'uk_gift_messages_order_id',
        columnNames: ['order_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'gift_messages',
      new TableForeignKey({
        name: 'fk_gift_messages_order_id',
        columnNames: ['order_id'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('gift_messages');

    if (!table) {
      return;
    }

    const foreignKey = table.foreignKeys.find(
      (key) => key.name === 'fk_gift_messages_order_id',
    );

    if (foreignKey) {
      await queryRunner.dropForeignKey('gift_messages', foreignKey);
    }

    const index = table.indices.find(
      (item) => item.name === 'uk_gift_messages_order_id',
    );

    if (index) {
      await queryRunner.dropIndex('gift_messages', index);
    }

    await queryRunner.dropTable('gift_messages');
  }
}
