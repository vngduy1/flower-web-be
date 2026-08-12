import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository, EntityManager } from 'typeorm';

import { CartsService } from '../carts/carts.service';

import { AdminCouponQueryDto } from './dto/admin-coupon-query.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CouponUsage } from './entities/coupon-usage.entity';
import { AvailableCouponQueryDto } from './dto/available-coupon-query.dto';
import { Coupon } from './entities/coupon.entity';
import { CouponDiscountType } from './enums/coupon-discount-type.enum';
import { CouponUsageQueryDto } from './dto/coupon-usage-query.dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponsRepository: Repository<Coupon>,

    @InjectRepository(CouponUsage)
    private readonly couponUsagesRepository: Repository<CouponUsage>,

    private readonly cartsService: CartsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Admin tạo Coupon.
   *
   * Nếu code đã tồn tại nhưng đang inactive thì khôi phục record cũ.
   */
  async create(dto: CreateCouponDto) {
    const code = this.normalizeCode(dto.code);

    this.validateCouponConfiguration({
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minimumOrderAmount: dto.minimumOrderAmount ?? 0,
      maximumDiscountAmount: dto.maximumDiscountAmount ?? null,
      usageLimit: dto.usageLimit ?? null,
      perUserLimit: dto.perUserLimit ?? null,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
    });

    const existing = await this.couponsRepository.findOne({
      where: {
        code,
      },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('Mã coupon đã tồn tại');
      }

      this.applyCouponData(existing, dto);

      existing.code = code;
      existing.isActive = dto.isActive ?? true;

      const restored = await this.couponsRepository.save(existing);

      return this.buildCouponResponse(restored);
    }

    const coupon = this.couponsRepository.create({
      code,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,

      discountType: dto.discountType,
      discountValue: dto.discountValue.toFixed(2),

      minimumOrderAmount: (dto.minimumOrderAmount ?? 0).toFixed(2),

      maximumDiscountAmount:
        dto.maximumDiscountAmount !== undefined
          ? dto.maximumDiscountAmount.toFixed(2)
          : null,

      usageLimit: dto.usageLimit ?? null,
      usedCount: 0,
      perUserLimit: dto.perUserLimit ?? null,

      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),

      isActive: dto.isActive ?? true,
    });

    const saved = await this.couponsRepository.save(coupon);

    return this.buildCouponResponse(saved);
  }

  /**
   * Admin lấy danh sách Coupon.
   */
  async findAll(query: AdminCouponQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.couponsRepository
      .createQueryBuilder('coupon')
      .orderBy('coupon.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;

      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('coupon.code LIKE :keyword', {
            keyword,
          }).orWhere('coupon.name LIKE :keyword', {
            keyword,
          });
        }),
      );
    }

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('coupon.isActive = :isActive', {
        isActive: query.isActive,
      });
    }

    const [coupons, total] = await queryBuilder.getManyAndCount();

    return {
      items: coupons.map((coupon) => this.buildCouponResponse(coupon)),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findUsages(couponId: string, query: CouponUsageQueryDto) {
    await this.findCouponEntity(couponId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.couponUsagesRepository
      .createQueryBuilder('usage')
      .leftJoinAndSelect('usage.user', 'user')
      .leftJoinAndSelect('usage.order', 'order')
      .where('usage.couponId = :couponId', {
        couponId,
      })
      .orderBy('usage.usedAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.isReversed !== undefined) {
      queryBuilder.andWhere('usage.isReversed = :isReversed', {
        isReversed: query.isReversed,
      });
    }

    const [usages, total] = await queryBuilder.getManyAndCount();

    return {
      items: usages.map((usage) => ({
        id: usage.id,

        user: usage.user
          ? {
              id: usage.user.id,
              email: usage.user.email,
              fullName: usage.user.fullName,
            }
          : null,

        order: usage.order
          ? {
              id: usage.order.id,
              orderNumber: usage.order.orderNumber,
              status: usage.order.status,
            }
          : null,

        discountAmount: Number(usage.discountAmount),

        isReversed: usage.isReversed,
        reversedAt: usage.reversedAt,
        usedAt: usage.usedAt,
      })),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin lấy chi tiết Coupon.
   */
  async findOne(id: string) {
    const coupon = await this.findCouponEntity(id);

    return this.buildCouponResponse(coupon);
  }

  /**
   * Admin cập nhật Coupon.
   */
  async update(id: string, dto: UpdateCouponDto) {
    const coupon = await this.findCouponEntity(id);

    const nextCode =
      dto.code !== undefined ? this.normalizeCode(dto.code) : coupon.code;

    if (nextCode !== coupon.code) {
      const duplicate = await this.couponsRepository.findOne({
        where: {
          code: nextCode,
        },
      });

      if (duplicate && duplicate.id !== coupon.id) {
        throw new ConflictException('Mã coupon đã tồn tại');
      }
    }

    const discountType = dto.discountType ?? coupon.discountType;

    const discountValue = dto.discountValue ?? Number(coupon.discountValue);

    const minimumOrderAmount =
      dto.minimumOrderAmount ?? Number(coupon.minimumOrderAmount);

    const maximumDiscountAmount =
      dto.maximumDiscountAmount !== undefined
        ? dto.maximumDiscountAmount
        : coupon.maximumDiscountAmount !== null
          ? Number(coupon.maximumDiscountAmount)
          : null;

    const usageLimit =
      dto.usageLimit !== undefined ? dto.usageLimit : coupon.usageLimit;

    const perUserLimit =
      dto.perUserLimit !== undefined ? dto.perUserLimit : coupon.perUserLimit;

    const startsAt = dto.startsAt ?? coupon.startsAt.toISOString();

    const endsAt = dto.endsAt ?? coupon.endsAt.toISOString();

    this.validateCouponConfiguration({
      discountType,
      discountValue,
      minimumOrderAmount,
      maximumDiscountAmount,
      usageLimit,
      perUserLimit,
      startsAt,
      endsAt,
    });

    coupon.code = nextCode;

    if (dto.name !== undefined) {
      coupon.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      coupon.description = dto.description.trim() || null;
    }

    coupon.discountType = discountType;
    coupon.discountValue = discountValue.toFixed(2);

    coupon.minimumOrderAmount = minimumOrderAmount.toFixed(2);

    coupon.maximumDiscountAmount =
      maximumDiscountAmount !== null ? maximumDiscountAmount.toFixed(2) : null;

    coupon.usageLimit = usageLimit;
    coupon.perUserLimit = perUserLimit;

    coupon.startsAt = new Date(startsAt);
    coupon.endsAt = new Date(endsAt);

    if (dto.isActive !== undefined) {
      coupon.isActive = dto.isActive;
    }

    const saved = await this.couponsRepository.save(coupon);

    return this.buildCouponResponse(saved);
  }

  /**
   * Admin vô hiệu hóa Coupon.
   */
  async remove(id: string) {
    const coupon = await this.findCouponEntity(id);

    if (!coupon.isActive) {
      throw new ConflictException('Coupon đã bị vô hiệu hóa trước đó');
    }

    coupon.isActive = false;

    await this.couponsRepository.save(coupon);

    return {
      message: 'Đã vô hiệu hóa coupon',
    };
  }

  /**
   * Customer kiểm tra Coupon dựa trên giỏ hàng hiện tại.
   */
  async validateForCurrentCart(userId: string, code: string) {
    const cartData = await this.cartsService.getCartData(userId);

    if (!cartData.items?.length) {
      throw new BadRequestException('Giỏ hàng đang trống');
    }

    return this.validateCoupon(userId, code, cartData.subtotal);
  }

  /**
   * Kiểm tra Coupon và tính tiền giảm.
   *
   * Method này sau đó sẽ được dùng trong:
   * - CheckoutService
   * - OrdersService
   */
  async validateCoupon(userId: string, code: string, subtotal: number) {
    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      throw new BadRequestException('Giá trị giỏ hàng không hợp lệ');
    }

    const normalizedCode = this.normalizeCode(code);

    const coupon = await this.couponsRepository.findOne({
      where: {
        code: normalizedCode,
      },
    });

    if (!coupon || !coupon.isActive) {
      throw new NotFoundException(
        'Coupon không tồn tại hoặc đã bị vô hiệu hóa',
      );
    }

    const now = new Date();

    if (now < coupon.startsAt) {
      throw new ConflictException('Coupon chưa đến thời gian sử dụng');
    }

    if (now > coupon.endsAt) {
      throw new ConflictException('Coupon đã hết hạn');
    }

    if (subtotal < Number(coupon.minimumOrderAmount)) {
      throw new ConflictException(
        `Giá trị đơn hàng tối thiểu để sử dụng coupon là ${Number(
          coupon.minimumOrderAmount,
        )}`,
      );
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new ConflictException('Coupon đã hết lượt sử dụng');
    }

    if (coupon.perUserLimit !== null) {
      const userUsageCount = await this.couponUsagesRepository.count({
        where: {
          couponId: coupon.id,
          userId,
          isReversed: false,
        },
      });

      if (userUsageCount >= coupon.perUserLimit) {
        throw new ConflictException(
          'Bạn đã sử dụng hết số lượt cho phép của coupon này',
        );
      }
    }

    const discountAmount = this.calculateDiscount(coupon, subtotal);

    return {
      valid: true,

      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        minimumOrderAmount: Number(coupon.minimumOrderAmount),
        maximumDiscountAmount:
          coupon.maximumDiscountAmount !== null
            ? Number(coupon.maximumDiscountAmount)
            : null,
      },

      subtotal,
      discountAmount,
      totalAfterDiscount: Math.max(subtotal - discountAmount, 0),
      currency: 'JPY',
    };
  }

  /**
   * Tính số tiền giảm.
   */
  private calculateDiscount(coupon: Coupon, subtotal: number): number {
    let discountAmount: number;

    if (coupon.discountType === CouponDiscountType.FIXED_AMOUNT) {
      discountAmount = Number(coupon.discountValue);
    } else {
      discountAmount = subtotal * (Number(coupon.discountValue) / 100);
    }

    if (coupon.maximumDiscountAmount !== null) {
      discountAmount = Math.min(
        discountAmount,
        Number(coupon.maximumDiscountAmount),
      );
    }

    /*
     * Coupon không được làm tổng tiền âm.
     * Vì dùng JPY nên làm tròn về số nguyên.
     */
    return Math.min(Math.round(discountAmount), subtotal);
  }

  private validateCouponConfiguration(params: {
    discountType: CouponDiscountType;
    discountValue: number;
    minimumOrderAmount: number;
    maximumDiscountAmount: number | null;
    usageLimit: number | null;
    perUserLimit: number | null;
    startsAt: string;
    endsAt: string;
  }): void {
    if (
      params.discountType === CouponDiscountType.PERCENTAGE &&
      params.discountValue > 100
    ) {
      throw new BadRequestException(
        'Coupon phần trăm không được vượt quá 100%',
      );
    }

    if (params.discountValue <= 0) {
      throw new BadRequestException('Giá trị giảm phải lớn hơn 0');
    }

    if (params.minimumOrderAmount < 0) {
      throw new BadRequestException('Giá trị đơn hàng tối thiểu không hợp lệ');
    }

    if (
      params.maximumDiscountAmount !== null &&
      params.maximumDiscountAmount <= 0
    ) {
      throw new BadRequestException('Số tiền giảm tối đa phải lớn hơn 0');
    }

    if (params.usageLimit !== null && params.usageLimit < 1) {
      throw new BadRequestException('Giới hạn sử dụng phải lớn hơn 0');
    }

    if (params.perUserLimit !== null && params.perUserLimit < 1) {
      throw new BadRequestException('Giới hạn theo người dùng phải lớn hơn 0');
    }

    const startsAt = new Date(params.startsAt);
    const endsAt = new Date(params.endsAt);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Thời gian coupon không hợp lệ');
    }

    if (startsAt >= endsAt) {
      throw new BadRequestException(
        'Thời gian kết thúc phải sau thời gian bắt đầu',
      );
    }
  }

  private applyCouponData(coupon: Coupon, dto: CreateCouponDto): void {
    coupon.name = dto.name.trim();

    coupon.description = dto.description?.trim() || null;

    coupon.discountType = dto.discountType;

    coupon.discountValue = dto.discountValue.toFixed(2);

    coupon.minimumOrderAmount = (dto.minimumOrderAmount ?? 0).toFixed(2);

    coupon.maximumDiscountAmount =
      dto.maximumDiscountAmount !== undefined
        ? dto.maximumDiscountAmount.toFixed(2)
        : null;

    coupon.usageLimit = dto.usageLimit ?? null;
    coupon.perUserLimit = dto.perUserLimit ?? null;

    coupon.startsAt = new Date(dto.startsAt);
    coupon.endsAt = new Date(dto.endsAt);
  }

  private async findCouponEntity(id: string): Promise<Coupon> {
    const coupon = await this.couponsRepository.findOne({
      where: {
        id,
      },
    });

    if (!coupon) {
      throw new NotFoundException('Không tìm thấy coupon');
    }

    return coupon;
  }

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private buildCouponResponse(coupon: Coupon) {
    const now = new Date();

    return {
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,

      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),

      minimumOrderAmount: Number(coupon.minimumOrderAmount),

      maximumDiscountAmount:
        coupon.maximumDiscountAmount !== null
          ? Number(coupon.maximumDiscountAmount)
          : null,

      usageLimit: coupon.usageLimit,
      usedCount: coupon.usedCount,
      remainingUsage:
        coupon.usageLimit !== null
          ? Math.max(coupon.usageLimit - coupon.usedCount, 0)
          : null,

      perUserLimit: coupon.perUserLimit,

      startsAt: coupon.startsAt,
      endsAt: coupon.endsAt,

      isActive: coupon.isActive,

      availability: {
        hasStarted: now >= coupon.startsAt,
        hasExpired: now > coupon.endsAt,
        usageLimitReached:
          coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit,
      },

      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
    };
  }

  async applyCouponForOrder(
    manager: EntityManager,
    userId: string,
    code: string,
    subtotal: number,
  ) {
    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      throw new BadRequestException('Giá trị đơn hàng không hợp lệ');
    }

    const couponRepository = manager.getRepository(Coupon);

    const couponUsageRepository = manager.getRepository(CouponUsage);

    const normalizedCode = this.normalizeCode(code);

    const coupon = await couponRepository.findOne({
      where: {
        code: normalizedCode,
      },
      lock: {
        mode: 'pessimistic_write',
      },
    });

    if (!coupon || !coupon.isActive) {
      throw new NotFoundException(
        'Coupon không tồn tại hoặc đã bị vô hiệu hóa',
      );
    }

    const now = new Date();

    if (now < coupon.startsAt) {
      throw new ConflictException('Coupon chưa đến thời gian sử dụng');
    }

    if (now > coupon.endsAt) {
      throw new ConflictException('Coupon đã hết hạn');
    }

    if (subtotal < Number(coupon.minimumOrderAmount)) {
      throw new ConflictException(
        `Giá trị đơn hàng tối thiểu để sử dụng coupon là ${Number(
          coupon.minimumOrderAmount,
        )}`,
      );
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new ConflictException('Coupon đã hết lượt sử dụng');
    }

    if (coupon.perUserLimit !== null) {
      const userUsageCount = await couponUsageRepository.count({
        where: {
          couponId: coupon.id,
          userId,
          isReversed: false,
        },
      });

      if (userUsageCount >= coupon.perUserLimit) {
        throw new ConflictException(
          'Bạn đã sử dụng hết số lượt cho phép của coupon này',
        );
      }
    }

    const discountAmount = this.calculateDiscount(coupon, subtotal);

    return {
      coupon,
      discountAmount,
    };
  }

  async recordCouponUsage(
    manager: EntityManager,
    params: {
      coupon: Coupon;
      userId: string;
      orderId: string;
      discountAmount: number;
    },
  ): Promise<void> {
    if (params.discountAmount <= 0) {
      return;
    }

    const couponRepository = manager.getRepository(Coupon);

    const usageRepository = manager.getRepository(CouponUsage);

    const existingUsage = await usageRepository.findOne({
      where: {
        orderId: params.orderId,
      },
    });

    if (existingUsage) {
      throw new ConflictException('Đơn hàng đã được ghi nhận sử dụng coupon');
    }

    const usage = usageRepository.create({
      couponId: params.coupon.id,
      userId: params.userId,
      orderId: params.orderId,
      discountAmount: params.discountAmount.toFixed(2),
      isReversed: false,
      reversedAt: null,
    });

    await usageRepository.save(usage);

    await couponRepository.increment(
      {
        id: params.coupon.id,
      },
      'usedCount',
      1,
    );

    params.coupon.usedCount += 1;
  }

  async findAvailable(userId: string, query: AvailableCouponQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const now = new Date();

    const qb = this.couponsRepository
      .createQueryBuilder('coupon')
      .where('coupon.isActive = :isActive', {
        isActive: true,
      })
      .andWhere('coupon.startsAt <= :now', {
        now,
      })
      .andWhere('coupon.endsAt >= :now', {
        now,
      })
      .andWhere(
        `(
    coupon.usage_limit IS NULL
    OR coupon.used_count < coupon.usage_limit
  )`,
      )
      .andWhere(
        `(
    coupon.per_user_limit IS NULL
    OR (
      SELECT COUNT(cu.id)
      FROM coupon_usages cu
      WHERE cu.coupon_id = coupon.id
        AND cu.user_id = :availableCouponUserId
        AND cu.is_reversed = false
    ) < coupon.per_user_limit
  )`,
        {
          availableCouponUserId: userId,
        },
      )
      .orderBy('coupon.endsAt', 'ASC')
      .addOrderBy('coupon.id', 'ASC')
      .skip(skip)
      .take(limit);

    const [coupons, total] = await qb.getManyAndCount();

    if (coupons.length === 0) {
      return {
        items: [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    const couponIds = coupons.map((coupon) => coupon.id);

    const usageRows = await this.couponUsagesRepository
      .createQueryBuilder('usage')
      .select('usage.couponId', 'couponId')
      .addSelect('COUNT(usage.id)', 'usageCount')
      .where('usage.userId = :userId', {
        userId,
      })
      .andWhere('usage.isReversed = :isReversed', {
        isReversed: false,
      })
      .andWhere('usage.couponId IN (:...couponIds)', {
        couponIds,
      })
      .groupBy('usage.couponId')
      .getRawMany<{
        couponId: string;
        usageCount: string;
      }>();

    const usageCountMap = new Map<string, number>(
      usageRows.map((row) => [String(row.couponId), Number(row.usageCount)]),
    );

    const items = coupons
      .map((coupon) => {
        const userUsageCount = usageCountMap.get(coupon.id) ?? 0;

        const remainingPerUser =
          coupon.perUserLimit === null
            ? null
            : Math.max(coupon.perUserLimit - userUsageCount, 0);

        return {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          description: coupon.description,

          discountType: coupon.discountType,
          discountValue: Number(coupon.discountValue),

          maximumDiscountAmount:
            coupon.maximumDiscountAmount !== null
              ? Number(coupon.maximumDiscountAmount)
              : null,

          minimumOrderAmount: Number(coupon.minimumOrderAmount),

          usageLimit: coupon.usageLimit,
          remainingUsage:
            coupon.usageLimit === null
              ? null
              : Math.max(coupon.usageLimit - coupon.usedCount, 0),

          perUserLimit: coupon.perUserLimit,
          userUsageCount,
          remainingPerUser,

          startsAt: coupon.startsAt,
          endsAt: coupon.endsAt,
        };
      })
      .filter(
        (coupon) =>
          coupon.remainingPerUser === null || coupon.remainingPerUser > 0,
      );

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async reverseCouponUsage(
    manager: EntityManager,
    orderId: string,
  ): Promise<boolean> {
    const couponRepository = manager.getRepository(Coupon);

    const usageRepository = manager.getRepository(CouponUsage);

    const usage = await usageRepository.findOne({
      where: {
        orderId,
        isReversed: false,
      },
      lock: {
        mode: 'pessimistic_write',
      },
    });

    /*
     * Đơn hàng không dùng coupon hoặc usage đã reverse.
     * Không coi đây là lỗi.
     */
    if (!usage) {
      return false;
    }

    const coupon = await couponRepository.findOne({
      where: {
        id: usage.couponId,
      },
      lock: {
        mode: 'pessimistic_write',
      },
    });

    if (!coupon) {
      throw new NotFoundException(
        'Không tìm thấy coupon cần hoàn lượt sử dụng',
      );
    }

    usage.isReversed = true;
    usage.reversedAt = new Date();

    await usageRepository.save(usage);

    if (coupon.usedCount > 0) {
      await couponRepository.decrement(
        {
          id: coupon.id,
        },
        'usedCount',
        1,
      );
    }

    return true;
  }
}
