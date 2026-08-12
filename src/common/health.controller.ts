import {
  Controller,
  Get,
  Header,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

interface HealthResponse {
  status: 'ok';
}

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly dataSource: DataSource) {}

  @Get('live')
  @Header('Cache-Control', 'no-store')
  live(): HealthResponse {
    return { status: 'ok' };
  }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  async ready(): Promise<HealthResponse> {
    try {
      await this.dataSource.query('SELECT 1');

      return { status: 'ok' };
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: 'readiness_failed',
          dependency: 'database',
          errorType: error instanceof Error ? error.name : 'UnknownError',
        }),
      );

      throw new ServiceUnavailableException({ status: 'unavailable' });
    }
  }
}
