import { DataSource, Repository } from 'typeorm';

import { CartsService } from '../carts/carts.service';

import { CouponsService } from './coupons.service';
import { CouponUsage } from './entities/coupon-usage.entity';
import { Coupon } from './entities/coupon.entity';

describe('CouponsService', () => {
  it('paginates the per-user eligible set and preserves totals on an empty page', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 5]),
    };
    const couponRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<Coupon>;
    const service = new CouponsService(
      couponRepository,
      {} as Repository<CouponUsage>,
      {} as CartsService,
      {} as DataSource,
    );

    const result = await service.findAvailable('17', { page: 3, limit: 2 });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('coupon.per_user_limit IS NULL'),
      { availableCouponUserId: '17' },
    );
    expect(result).toEqual({
      items: [],
      pagination: { page: 3, limit: 2, total: 5, totalPages: 3 },
    });
  });
});
