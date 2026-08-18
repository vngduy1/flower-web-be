import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { OrderStatus } from '../orders/enums/order-status.enum';

import { CreateGiftMessageDto } from './dto/create-gift-message.dto';
import { UpdateGiftMessageDto } from './dto/update-gift-message.dto';
import { GiftMessage } from './entities/gift-message.entity';

@Injectable()
export class GiftMessagesService {
  constructor(
    @InjectRepository(GiftMessage)
    private readonly giftMessageRepository: Repository<GiftMessage>,
  ) {}

  async findByOrderId(orderId: string): Promise<GiftMessage | null> {
    return this.giftMessageRepository.findOne({
      where: { orderId },
    });
  }

  async create(
    orderId: string,
    dto: CreateGiftMessageDto,
    manager?: EntityManager,
  ): Promise<GiftMessage> {
    const repository = manager
      ? manager.getRepository(GiftMessage)
      : this.giftMessageRepository;

    const existing = await repository.findOne({
      where: { orderId },
    });

    if (existing) {
      throw new BadRequestException(
        'この注文には既にメッセージカードが登録されています。',
      );
    }

    const giftMessage = repository.create({
      orderId,
      cardType: dto.cardType,
      message: dto.message,
      senderName: dto.senderName ?? null,
    });

    return repository.save(giftMessage);
  }

  async updateForUser(
    orderId: string,
    userId: string,
    dto: UpdateGiftMessageDto,
  ): Promise<GiftMessage> {
    const giftMessage = await this.giftMessageRepository.findOne({
      where: { orderId },
      relations: {
        order: true,
      },
    });

    if (!giftMessage) {
      throw new NotFoundException('メッセージカードが見つかりません。');
    }

    if (giftMessage.order.userId !== userId) {
      throw new NotFoundException('メッセージカードが見つかりません。');
    }

    if (giftMessage.order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'この注文のメッセージカードは変更できません。',
      );
    }

    this.giftMessageRepository.merge(giftMessage, dto);

    return this.giftMessageRepository.save(giftMessage);
  }
}
