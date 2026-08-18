import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GiftMessage } from './entities/gift-message.entity';
import { GiftMessagesService } from './gift-messages.service';

@Module({
  imports: [TypeOrmModule.forFeature([GiftMessage])],
  providers: [GiftMessagesService],
  exports: [GiftMessagesService],
})
export class GiftMessagesModule {}
