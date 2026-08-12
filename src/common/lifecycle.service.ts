import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';

@Injectable()
export class LifecycleService implements OnApplicationShutdown {
  private readonly logger = new Logger(LifecycleService.name);

  onApplicationShutdown(signal?: string): void {
    this.logger.log(
      JSON.stringify({
        event: 'application_stopped',
        signal: signal ?? 'application_close',
      }),
    );
  }
}
