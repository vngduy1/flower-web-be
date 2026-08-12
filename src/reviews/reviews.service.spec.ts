/* eslint-disable @typescript-eslint/unbound-method */
import { DataSource, EntityManager, Repository } from 'typeorm';

import { NotificationsService } from '../notifications/notifications.service';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { Product } from '../products/entities/product.entity';

import { ProductReview } from './entities/product-review.entity';
import { ReviewStatus } from './enums/review-status.enum';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  it('does not emit REVIEW_APPROVED when a pending review is created', async () => {
    const orderItem = {
      id: '4',
      productId: '9',
      order: { userId: '2', status: OrderStatus.DELIVERED },
    } as OrderItem;
    const review = {
      id: '15',
      productId: '9',
      userId: '2',
      orderItemId: '4',
      rating: 5,
      title: null,
      comment: 'Excellent',
      status: ReviewStatus.PENDING,
      deletedAt: null,
    } as ProductReview;
    const orderItemRepository = {
      findOne: jest.fn().mockResolvedValue(orderItem),
    };
    const reviewRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockReturnValue(review),
      save: jest.fn().mockResolvedValue(review),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === OrderItem ? orderItemRepository : reviewRepository,
      ),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(
        (callback: (entityManager: EntityManager) => Promise<string>) =>
          callback(manager),
      ),
    } as unknown as DataSource;
    const notificationsService = {
      createWithManager: jest.fn(),
    } as unknown as NotificationsService;
    const service = new ReviewsService(
      {} as Repository<ProductReview>,
      {} as Repository<Product>,
      notificationsService,
      dataSource,
    );
    jest.spyOn(service, 'findMyReview').mockResolvedValue({} as never);

    await service.create('2', {
      orderItemId: '4',
      rating: 5,
      comment: 'Excellent',
    });

    expect(reviewRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: ReviewStatus.PENDING }),
    );
    expect(notificationsService.createWithManager).not.toHaveBeenCalled();
  });
});
