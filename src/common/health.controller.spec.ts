import { ServiceUnavailableException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports liveness without checking dependencies', () => {
    const controller = new HealthController({} as DataSource);

    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('reports readiness when the database responds', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ result: 1 }]),
    } as unknown as DataSource;
    const controller = new HealthController(dataSource);

    await expect(controller.ready()).resolves.toEqual({ status: 'ok' });
  });

  it('does not expose database errors in the readiness response', async () => {
    const dataSource = {
      query: jest.fn().mockRejectedValue(new Error('internal database detail')),
    } as unknown as DataSource;
    const controller = new HealthController(dataSource);

    await expect(controller.ready()).rejects.toMatchObject<
      Partial<ServiceUnavailableException>
    >({
      message: 'Service Unavailable Exception',
    });
  });
});
