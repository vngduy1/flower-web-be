import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, IsNull, Repository } from 'typeorm';

import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { Product } from '../products/entities/product.entity';

import { AdminReviewQueryDto } from './dto/admin-review-query.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { RejectReviewDto } from './dto/reject-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ProductReview } from './entities/product-review.entity';
import { ReviewStatus } from './enums/review-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ProductReview)
    private readonly reviewsRepository: Repository<ProductReview>,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    private readonly notificationsService: NotificationsService,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Customer tạo đánh giá.
   *
   * Điều kiện:
   * - OrderItem thuộc đơn hàng của user hiện tại.
   * - Order đã DELIVERED.
   * - OrderItem còn productId.
   * - OrderItem chưa được đánh giá.
   */
  async create(userId: string, dto: CreateReviewDto) {
    const reviewId = await this.dataSource.transaction(async (manager) => {
      const orderItemRepository = manager.getRepository(OrderItem);

      const reviewRepository = manager.getRepository(ProductReview);

      const orderItem = await orderItemRepository.findOne({
        where: {
          id: dto.orderItemId,
        },
        relations: {
          order: true,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!orderItem || orderItem.order.userId !== userId) {
        throw new NotFoundException(
          'Không tìm thấy sản phẩm đã mua trong đơn hàng',
        );
      }

      if (orderItem.order.status !== OrderStatus.DELIVERED) {
        throw new ConflictException(
          'Chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã được giao',
        );
      }

      if (!orderItem.productId) {
        throw new ConflictException(
          'Sản phẩm của đơn hàng này không còn tồn tại',
        );
      }

      /*
       * withDeleted để phát hiện review đã xóa mềm.
       */
      const existingReview = await reviewRepository.findOne({
        where: {
          orderItemId: orderItem.id,
        },
        withDeleted: true,
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (existingReview && existingReview.deletedAt === null) {
        throw new ConflictException(
          'Sản phẩm trong đơn hàng này đã được đánh giá',
        );
      }

      /*
       * Nếu trước đây user đã xóa review thì khôi phục
       * chính record cũ, tránh vi phạm unique orderItemId.
       */
      if (existingReview) {
        existingReview.productId = orderItem.productId;
        existingReview.userId = userId;
        existingReview.rating = dto.rating;
        existingReview.title = dto.title?.trim() || null;
        existingReview.comment = dto.comment.trim();

        existingReview.status = ReviewStatus.PENDING;

        existingReview.adminComment = null;
        existingReview.approvedAt = null;
        existingReview.rejectedAt = null;
        existingReview.deletedAt = null;

        const restored = await reviewRepository.save(existingReview);

        return restored.id;
      }

      const review = reviewRepository.create({
        productId: orderItem.productId,
        userId,
        orderItemId: orderItem.id,

        rating: dto.rating,
        title: dto.title?.trim() || null,
        comment: dto.comment.trim(),

        status: ReviewStatus.PENDING,

        adminComment: null,
        approvedAt: null,
        rejectedAt: null,
      });

      const saved = await reviewRepository.save(review);

      await this.notificationsService.createWithManager(manager, {
        userId: review.userId,
        type: NotificationType.REVIEW_APPROVED,
        title: 'Đánh giá đã được duyệt',
        message: 'Đánh giá sản phẩm của bạn đã được duyệt.',
        referenceType: 'REVIEW',
        referenceId: review.id,
      });

      return saved.id;
    });

    return this.findMyReview(userId, reviewId);
  }

  /**
   * Danh sách review đã duyệt của một sản phẩm.
   * API này có thể dùng ở trang chi tiết sản phẩm.
   */
  async findApprovedByProduct(productId: string) {
    const product = await this.productsRepository.findOne({
      where: {
        id: productId,
        deletedAt: IsNull(),
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const reviews = await this.reviewsRepository.find({
      where: {
        productId,
        status: ReviewStatus.APPROVED,
        deletedAt: IsNull(),
      },
      relations: {
        user: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    const reviewCount = reviews.length;

    const averageRating =
      reviewCount > 0
        ? Number(
            (
              reviews.reduce((sum, review) => sum + review.rating, 0) /
              reviewCount
            ).toFixed(1),
          )
        : 0;

    const ratingSummary = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    for (const review of reviews) {
      ratingSummary[review.rating as keyof typeof ratingSummary] += 1;
    }

    return {
      productId,
      reviewCount,
      averageRating,
      ratingSummary,

      items: reviews.map((review) => this.buildPublicResponse(review)),
    };
  }

  /**
   * Customer lấy toàn bộ review của mình.
   *
   * Bao gồm PENDING, APPROVED và REJECTED.
   */
  async findMyReviews(userId: string) {
    const reviews = await this.reviewsRepository.find({
      where: {
        userId,
        deletedAt: IsNull(),
      },
      relations: {
        product: true,
        orderItem: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return reviews.map((review) => this.buildOwnerResponse(review));
  }

  /**
   * Customer lấy một review thuộc chính mình.
   */
  async findMyReview(userId: string, reviewId: string) {
    const review = await this.reviewsRepository.findOne({
      where: {
        id: reviewId,
        userId,
        deletedAt: IsNull(),
      },
      relations: {
        product: true,
        orderItem: true,
      },
    });

    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    return this.buildOwnerResponse(review);
  }

  /**
   * Customer sửa review của mình.
   *
   * Sau khi sửa, review phải được admin duyệt lại.
   */
  async update(userId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.reviewsRepository.findOne({
      where: {
        id: reviewId,
        userId,
        deletedAt: IsNull(),
      },
    });

    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    if (
      dto.rating === undefined &&
      dto.title === undefined &&
      dto.comment === undefined
    ) {
      throw new ConflictException('Không có nội dung cần cập nhật');
    }

    if (dto.rating !== undefined) {
      review.rating = dto.rating;
    }

    if (dto.title !== undefined) {
      review.title = dto.title.trim() || null;
    }

    if (dto.comment !== undefined) {
      const comment = dto.comment.trim();

      if (!comment) {
        throw new ConflictException('Nội dung đánh giá không được để trống');
      }

      review.comment = comment;
    }

    /*
     * Nội dung đã thay đổi nên phải duyệt lại.
     */
    review.status = ReviewStatus.PENDING;
    review.adminComment = null;
    review.approvedAt = null;
    review.rejectedAt = null;

    await this.reviewsRepository.save(review);

    return this.findMyReview(userId, review.id);
  }

  /**
   * Customer xóa mềm review của mình.
   */
  async remove(userId: string, reviewId: string) {
    const review = await this.reviewsRepository.findOne({
      where: {
        id: reviewId,
        userId,
        deletedAt: IsNull(),
      },
    });

    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    await this.reviewsRepository.softRemove(review);

    return {
      message: 'Đã xóa đánh giá',
    };
  }

  async adminFindAll(query: AdminReviewQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.reviewsRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.product', 'product')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.orderItem', 'orderItem')
      .leftJoinAndSelect('orderItem.order', 'order')
      .where('review.deletedAt IS NULL');

    if (query.status) {
      queryBuilder.andWhere('review.status = :status', {
        status: query.status,
      });
    }

    if (query.productId) {
      queryBuilder.andWhere('review.productId = :productId', {
        productId: query.productId,
      });
    }

    if (query.userId) {
      queryBuilder.andWhere('review.userId = :userId', {
        userId: query.userId,
      });
    }

    if (query.rating !== undefined) {
      queryBuilder.andWhere('review.rating = :rating', {
        rating: query.rating,
      });
    }

    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;

      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('review.title LIKE :keyword', { keyword })
            .orWhere('review.comment LIKE :keyword', { keyword })
            .orWhere('product.name LIKE :keyword', { keyword })
            .orWhere('product.productCode LIKE :keyword', { keyword })
            .orWhere('user.fullName LIKE :keyword', { keyword })
            .orWhere('user.email LIKE :keyword', { keyword })
            .orWhere('order.orderNumber LIKE :keyword', { keyword });
        }),
      );
    }

    if (query.createdFrom) {
      queryBuilder.andWhere('review.createdAt >= :createdFrom', {
        createdFrom: new Date(`${query.createdFrom}T00:00:00+09:00`),
      });
    }

    if (query.createdTo) {
      queryBuilder.andWhere('review.createdAt <= :createdTo', {
        createdTo: new Date(`${query.createdTo}T23:59:59.999+09:00`),
      });
    }

    const sortMap: Record<string, string> = {
      createdAt: 'review.createdAt',
      updatedAt: 'review.updatedAt',
      rating: 'review.rating',
      status: 'review.status',
    };

    queryBuilder
      .orderBy(sortMap[query.sortBy ?? 'createdAt'], query.sortOrder ?? 'DESC')
      .skip(skip)
      .take(limit);

    const [reviews, total] = await queryBuilder.getManyAndCount();

    return {
      items: reviews.map((review) => this.buildAdminResponse(review)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adminFindOne(reviewId: string) {
    const review = await this.reviewsRepository.findOne({
      where: {
        id: reviewId,
        deletedAt: IsNull(),
      },
      relations: {
        product: true,
        user: true,
        orderItem: {
          order: true,
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    return this.buildAdminResponse(review);
  }

  async approve(reviewId: string) {
    await this.dataSource.transaction(async (manager) => {
      const reviewRepository = manager.getRepository(ProductReview);

      const review = await reviewRepository.findOne({
        where: {
          id: reviewId,
          deletedAt: IsNull(),
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!review) {
        throw new NotFoundException('Không tìm thấy đánh giá');
      }

      if (review.status === ReviewStatus.APPROVED) {
        throw new ConflictException('Đánh giá đã được duyệt trước đó');
      }

      review.status = ReviewStatus.APPROVED;
      review.approvedAt = new Date();
      review.rejectedAt = null;
      review.adminComment = null;

      await reviewRepository.save(review);

      await this.notificationsService.createWithManager(manager, {
        userId: review.userId,
        type: NotificationType.REVIEW_APPROVED,
        title: 'Đánh giá đã được duyệt',
        message: 'Đánh giá sản phẩm của bạn đã được duyệt.',
        referenceType: 'REVIEW',
        referenceId: review.id,
      });
    });

    return this.adminFindOne(reviewId);
  }

  async reject(reviewId: string, dto: RejectReviewDto) {
    await this.dataSource.transaction(async (manager) => {
      const reviewRepository = manager.getRepository(ProductReview);

      const review = await reviewRepository.findOne({
        where: {
          id: reviewId,
          deletedAt: IsNull(),
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!review) {
        throw new NotFoundException('Không tìm thấy đánh giá');
      }

      if (review.status === ReviewStatus.REJECTED) {
        throw new ConflictException('Đánh giá đã bị từ chối trước đó');
      }

      review.status = ReviewStatus.REJECTED;
      review.adminComment = dto.adminComment.trim();
      review.approvedAt = null;
      review.rejectedAt = new Date();

      await reviewRepository.save(review);

      await this.notificationsService.createWithManager(manager, {
        userId: review.userId,
        type: NotificationType.REVIEW_REJECTED,
        title: 'Đánh giá chưa được duyệt',
        message:
          `Đánh giá của bạn chưa được duyệt. ` +
          `Lý do: ${review.adminComment}`,
        referenceType: 'REVIEW',
        referenceId: review.id,
      });
    });

    return this.adminFindOne(reviewId);
  }

  private buildPublicResponse(review: ProductReview) {
    return {
      id: review.id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,

      reviewer: {
        id: review.user.id,
        fullName: review.user.fullName,
      },

      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  private buildOwnerResponse(review: ProductReview) {
    return {
      id: review.id,

      product: review.product
        ? {
            id: review.product.id,
            productCode: review.product.productCode,
            name: review.product.name,
            slug: review.product.slug,
          }
        : null,

      orderItemId: review.orderItemId,

      rating: review.rating,
      title: review.title,
      comment: review.comment,

      status: review.status,
      adminComment: review.adminComment,

      approvedAt: review.approvedAt,
      rejectedAt: review.rejectedAt,

      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  private buildAdminResponse(review: ProductReview) {
    return {
      id: review.id,

      product: review.product
        ? {
            id: review.product.id,
            productCode: review.product.productCode,
            name: review.product.name,
            slug: review.product.slug,
          }
        : null,

      user: review.user
        ? {
            id: review.user.id,
            email: review.user.email,
            fullName: review.user.fullName,
            phone: review.user.phone,
          }
        : null,

      order: review.orderItem?.order
        ? {
            id: review.orderItem.order.id,
            orderNumber: review.orderItem.order.orderNumber,
            status: review.orderItem.order.status,
            deliveredAt: review.orderItem.order.deliveredAt,
          }
        : null,

      orderItemId: review.orderItemId,

      rating: review.rating,
      title: review.title,
      comment: review.comment,

      status: review.status,
      adminComment: review.adminComment,

      approvedAt: review.approvedAt,
      rejectedAt: review.rejectedAt,

      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  async adminRemove(reviewId: string) {
    const review = await this.reviewsRepository.findOne({
      where: {
        id: reviewId,
        deletedAt: IsNull(),
      },
    });

    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    await this.reviewsRepository.softRemove(review);

    return {
      message: 'Đã xóa đánh giá',
    };
  }

  async adminRestore(reviewId: string) {
    const review = await this.reviewsRepository.findOne({
      where: {
        id: reviewId,
      },
      withDeleted: true,
    });

    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    if (review.deletedAt === null) {
      throw new ConflictException('Đánh giá chưa bị xóa');
    }

    await this.reviewsRepository.restore(review.id);

    const restored = await this.reviewsRepository.findOne({
      where: {
        id: review.id,
      },
      relations: {
        product: true,
        user: true,
        orderItem: {
          order: true,
        },
      },
    });

    if (!restored) {
      throw new NotFoundException('Không thể lấy đánh giá sau khi khôi phục');
    }

    return {
      message: 'Đã khôi phục đánh giá',
      review: this.buildAdminResponse(restored),
    };
  }
}
