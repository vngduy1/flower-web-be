import { DataSource, EntityManager, Repository } from 'typeorm';

import { User } from '../users/entities/user.entity';

import { AddressesService } from './addresses.service';
import { UserAddress } from './entities/user-address.entity';

describe('AddressesService', () => {
  it('locks the user before creating or changing a default address', async () => {
    const address = {
      id: '3',
      userId: '7',
      isDefault: true,
    } as UserAddress;
    const updateBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({ id: '7' }),
    };
    const transactionAddressRepository = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockReturnValue(address),
      save: jest.fn().mockResolvedValue(address),
      createQueryBuilder: jest.fn().mockReturnValue(updateBuilder),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === User ? userRepository : transactionAddressRepository,
      ),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(
        (callback: (entityManager: EntityManager) => Promise<string>) =>
          callback(manager),
      ),
    } as unknown as DataSource;
    const addressRepository = {
      findOne: jest.fn().mockResolvedValue(address),
    } as unknown as Repository<UserAddress>;
    const service = new AddressesService(addressRepository, dataSource);

    await service.create('7', {
      recipientName: 'Test User',
      recipientPhone: '0900000000',
      postalCode: '1000001',
      prefecture: 'Tokyo',
      city: 'Chiyoda',
      addressLine1: '1-1',
      isDefault: true,
    });

    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { id: '7' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(userRepository.findOne.mock.invocationCallOrder[0]).toBeLessThan(
      transactionAddressRepository.count.mock.invocationCallOrder[0] ?? 0,
    );
  });
});
