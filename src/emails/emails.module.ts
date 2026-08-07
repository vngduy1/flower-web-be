import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EmailsService } from './emails.service';
import { EmailsController } from './emails.controller';

@Module({
  imports: [ConfigModule],
  controllers: [EmailsController],
  providers: [EmailsService],
  exports: [EmailsService],
})
export class EmailsModule {}
