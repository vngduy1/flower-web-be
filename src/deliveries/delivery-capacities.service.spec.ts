import { ConflictException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { DeliveryCapacitiesService } from './delivery-capacities.service';
import { DeliveryCapacity } from './entities/delivery-capacity.entity';
import { DeliveryTimeSlot } from './entities/delivery-time-slot.entity';

describe('DeliveryCapacitiesService', () => {
  const timeSlot = {
    id: '2',
    slotCode: 'AM',
    displayName: 'Morning',
    startTime: '09:00',
    endTime: '12:00',
    isActive: true,
  } as DeliveryTimeSlot;

  function createFixture(reservedOrders = 2) {
    const capacity = {
      id: '8',
      deliveryDate: '2026-08-15',
      timeSlotId: '2',
      timeSlot,
      maxOrders: 5,
      reservedOrders,
      isActive: true,
    } as DeliveryCapacity;
    const transactionCapacityRepository = {
      findOne: jest.fn().mockResolvedValue(capacity),
      save: jest.fn().mockImplementation((value: DeliveryCapacity) => value),
    };
    const transactionTimeSlotRepository = {
      findOne: jest.fn().mockResolvedValue(timeSlot),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === DeliveryCapacity
          ? transactionCapacityRepository
          : transactionTimeSlotRepository,
      ),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(
        (callback: (entityManager: EntityManager) => Promise<void>) =>
          callback(manager),
      ),
    } as unknown as DataSource;
    const capacityRepository = {
      findOne: jest.fn().mockResolvedValue(capacity),
    } as unknown as Repository<DeliveryCapacity>;
    const timeSlotRepository = {} as Repository<DeliveryTimeSlot>;

    return {
      service: new DeliveryCapacitiesService(
        capacityRepository,
        timeSlotRepository,
        dataSource,
      ),
      capacity,
      transactionCapacityRepository,
    };
  }

  it('locks the capacity before changing maxOrders', async () => {
    const fixture = createFixture();

    await fixture.service.update('8', { maxOrders: 6 });

    expect(fixture.transactionCapacityRepository.findOne).toHaveBeenCalledWith({
      where: { id: '8' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(fixture.capacity.maxOrders).toBe(6);
    expect(fixture.transactionCapacityRepository.save).toHaveBeenCalledTimes(1);
  });

  it('rejects maxOrders below the locked reservation count', async () => {
    const fixture = createFixture(4);

    await expect(
      fixture.service.update('8', { maxOrders: 3 }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(fixture.transactionCapacityRepository.save).not.toHaveBeenCalled();
  });

  it('rejects relocation while the locked capacity has reservations', async () => {
    const fixture = createFixture(1);

    await expect(
      fixture.service.update('8', { deliveryDate: '2026-08-16' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(fixture.transactionCapacityRepository.save).not.toHaveBeenCalled();
  });
});
