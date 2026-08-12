import { Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';

import { Inventory } from '../inventories/entities/inventory.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { PaymentStatus } from '../orders/enums/payment-status.enum';
import { Product } from '../products/entities/product.entity';
import { ProductReview } from '../reviews/entities/product-review.entity';
import { ReviewStatus } from '../reviews/enums/review-status.enum';
import { User } from '../users/entities/user.entity';
import { ProductImage } from '../product-images/entities/product-image.entity';
import { Notification } from '../notifications/entities/notification.entity';

type RawNumber = string | number | null;

interface OrderSummaryRow {
  total: RawNumber;
  today: RawNumber;
  pending: RawNumber;
  confirmed: RawNumber;
  preparing: RawNumber;
  shipped: RawNumber;
  delivered: RawNumber;
  cancelled: RawNumber;
}

interface RevenueRow {
  revenue: RawNumber;
}

interface UserSummaryRow {
  total: RawNumber;
  newToday: RawNumber;
  newThisMonth: RawNumber;
}

interface ProductSummaryRow {
  total: RawNumber;
  active: RawNumber;
}

interface InventorySummaryRow {
  lowStock: RawNumber;
  outOfStock: RawNumber;
}

interface ReviewSummaryRow {
  pending: RawNumber;
  approved: RawNumber;
  rejected: RawNumber;
}

interface RevenueChartRow {
  date: string;
  orderCount: RawNumber;
  revenue: RawNumber;
}

interface ProductSalesRow {
  productId: string | null;
  productCode: string;
  productName: string;
  quantitySold: RawNumber;
  orderCount: RawNumber;
  revenue: RawNumber;
}

interface ProductReviewSummaryRow {
  productId: string;
  reviewCount: RawNumber;
  averageRating: RawNumber;
}

interface LowStockRow {
  inventoryId: string;
  productId: string;
  productCode: string;
  productName: string;
  slug: string;
  productStatus: string;
  thumbnailUrl: string | null;
  stockQuantity: RawNumber;
  reservedQuantity: RawNumber;
  availableQuantity: RawNumber;
  lowStockThreshold: RawNumber;
}

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getSummary() {
    const todayStart = this.getTodayStartInJapan();
    const tomorrowStart = this.addDays(todayStart, 1);

    const monthStart = this.getMonthStartInJapan();
    const nextMonthStart = this.addMonths(monthStart, 1);

    const [
      orderSummary,
      todayRevenue,
      monthRevenue,
      userSummary,
      productSummary,
      reviewSummary,
      recentOrders,
    ] = await Promise.all([
      this.getOrderSummary(todayStart, tomorrowStart),
      this.getRevenue(todayStart, tomorrowStart),
      this.getRevenue(monthStart, nextMonthStart),
      this.getUserSummary(
        todayStart,
        tomorrowStart,
        monthStart,
        nextMonthStart,
      ),
      this.getProductSummary(),
      this.getReviewSummary(),
      this.getRecentOrders(),
    ]);

    return {
      orders: orderSummary,

      revenue: {
        today: todayRevenue,
        thisMonth: monthRevenue,
        currency: 'JPY',
      },

      users: userSummary,

      products: productSummary,

      reviews: reviewSummary,

      recentOrders,
    };
  }

  private async getOrderSummary(todayStart: Date, tomorrowStart: Date) {
    const orderRepository = this.dataSource.getRepository(Order);

    const raw = await orderRepository
      .createQueryBuilder('order')
      .select([
        'COUNT(*) AS total',
        `SUM(CASE
          WHEN order.created_at >= :todayStart
           AND order.created_at < :tomorrowStart
          THEN 1 ELSE 0
        END) AS today`,
        `SUM(CASE WHEN order.status = :pending THEN 1 ELSE 0 END) AS pending`,
        `SUM(CASE WHEN order.status = :confirmed THEN 1 ELSE 0 END) AS confirmed`,
        `SUM(CASE WHEN order.status = :preparing THEN 1 ELSE 0 END) AS preparing`,
        `SUM(CASE WHEN order.status = :shipped THEN 1 ELSE 0 END) AS shipped`,
        `SUM(CASE WHEN order.status = :delivered THEN 1 ELSE 0 END) AS delivered`,
        `SUM(CASE WHEN order.status = :cancelled THEN 1 ELSE 0 END) AS cancelled`,
      ])
      .setParameters({
        todayStart,
        tomorrowStart,
        pending: OrderStatus.PENDING,
        confirmed: OrderStatus.CONFIRMED,
        preparing: OrderStatus.PREPARING,
        shipped: OrderStatus.SHIPPED,
        delivered: OrderStatus.DELIVERED,
        cancelled: OrderStatus.CANCELLED,
      })
      .getRawOne<OrderSummaryRow>();

    return {
      total: Number(raw?.total ?? 0),
      today: Number(raw?.today ?? 0),
      pending: Number(raw?.pending ?? 0),
      confirmed: Number(raw?.confirmed ?? 0),
      preparing: Number(raw?.preparing ?? 0),
      shipped: Number(raw?.shipped ?? 0),
      delivered: Number(raw?.delivered ?? 0),
      cancelled: Number(raw?.cancelled ?? 0),
    };
  }

  private async getRevenue(start: Date, end: Date): Promise<number> {
    const raw = await this.dataSource
      .getRepository(Order)
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.total_amount), 0)', 'revenue')
      .where('order.created_at >= :start', {
        start,
      })
      .andWhere('order.created_at < :end', {
        end,
      })
      .andWhere('order.payment_status = :paymentStatus', {
        paymentStatus: PaymentStatus.PAID,
      })
      .andWhere('order.status != :cancelled', {
        cancelled: OrderStatus.CANCELLED,
      })
      .getRawOne<RevenueRow>();

    return Number(raw?.revenue ?? 0);
  }

  private async getUserSummary(
    todayStart: Date,
    tomorrowStart: Date,
    monthStart: Date,
    nextMonthStart: Date,
  ) {
    const raw = await this.dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .select([
        'COUNT(*) AS total',
        `SUM(CASE
          WHEN user.created_at >= :todayStart
           AND user.created_at < :tomorrowStart
          THEN 1 ELSE 0
        END) AS newToday`,
        `SUM(CASE
          WHEN user.created_at >= :monthStart
           AND user.created_at < :nextMonthStart
          THEN 1 ELSE 0
        END) AS newThisMonth`,
      ])
      .setParameters({
        todayStart,
        tomorrowStart,
        monthStart,
        nextMonthStart,
      })
      .where('user.deleted_at IS NULL')
      .getRawOne<UserSummaryRow>();

    return {
      total: Number(raw?.total ?? 0),
      newToday: Number(raw?.newToday ?? 0),
      newThisMonth: Number(raw?.newThisMonth ?? 0),
    };
  }

  private async getProductSummary() {
    const productRaw = await this.dataSource
      .getRepository(Product)
      .createQueryBuilder('product')
      .select([
        'COUNT(*) AS total',
        `SUM(CASE
          WHEN product.status = 'ACTIVE'
          THEN 1 ELSE 0
        END) AS active`,
      ])
      .where('product.deleted_at IS NULL')
      .getRawOne<ProductSummaryRow>();

    const inventoryRaw = await this.dataSource
      .getRepository(Inventory)
      .createQueryBuilder('inventory')
      .select([
        `SUM(CASE
          WHEN inventory.is_stock_managed = true
           AND (
             inventory.stock_quantity
             - inventory.reserved_quantity
           ) <= inventory.low_stock_threshold
           AND (
             inventory.stock_quantity
             - inventory.reserved_quantity
           ) > 0
          THEN 1 ELSE 0
        END) AS lowStock`,
        `SUM(CASE
          WHEN inventory.is_stock_managed = true
           AND (
             inventory.stock_quantity
             - inventory.reserved_quantity
           ) <= 0
          THEN 1 ELSE 0
        END) AS outOfStock`,
      ])
      .getRawOne<InventorySummaryRow>();

    return {
      total: Number(productRaw?.total ?? 0),
      active: Number(productRaw?.active ?? 0),
      lowStock: Number(inventoryRaw?.lowStock ?? 0),
      outOfStock: Number(inventoryRaw?.outOfStock ?? 0),
    };
  }

  private async getReviewSummary() {
    const raw = await this.dataSource
      .getRepository(ProductReview)
      .createQueryBuilder('review')
      .select([
        `SUM(CASE
          WHEN review.status = :pending
          THEN 1 ELSE 0
        END) AS pending`,
        `SUM(CASE
          WHEN review.status = :approved
          THEN 1 ELSE 0
        END) AS approved`,
        `SUM(CASE
          WHEN review.status = :rejected
          THEN 1 ELSE 0
        END) AS rejected`,
      ])
      .where('review.deleted_at IS NULL')
      .setParameters({
        pending: ReviewStatus.PENDING,
        approved: ReviewStatus.APPROVED,
        rejected: ReviewStatus.REJECTED,
      })
      .getRawOne<ReviewSummaryRow>();

    return {
      pending: Number(raw?.pending ?? 0),
      approved: Number(raw?.approved ?? 0),
      rejected: Number(raw?.rejected ?? 0),
    };
  }

  private async getRecentOrders() {
    const orders = await this.dataSource.getRepository(Order).find({
      relations: {
        user: true,
        items: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take: 10,
    });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,

      customer: {
        id: order.user.id,
        fullName: order.user.fullName,
        email: order.user.email,
      },

      status: order.status,
      paymentStatus: order.paymentStatus,

      totalQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),

      totalAmount: Number(order.totalAmount),
      currency: order.currencyCode,

      createdAt: order.createdAt,
    }));
  }

  private getTodayStartInJapan(): Date {
    const now = new Date();

    const japanDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    return new Date(`${japanDate}T00:00:00+09:00`);
  }

  private getMonthStartInJapan(): Date {
    const today = this.getTodayStartInJapan();

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(today);

    const year = parts.find((part) => part.type === 'year')?.value;

    const month = parts.find((part) => part.type === 'month')?.value;

    return new Date(`${year}-${month}-01T00:00:00+09:00`);
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  private addMonths(date: Date, months: number) {
    const result = new Date(date);
    result.setUTCMonth(result.getUTCMonth() + months);
    return result;
  }

  async getRevenueChart(from?: string, to?: string) {
    const endDate = to ? new Date(`${to}T23:59:59.999+09:00`) : new Date();

    const startDate = from
      ? new Date(`${from}T00:00:00+09:00`)
      : this.addDays(endDate, -29);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error('Khoảng thời gian không hợp lệ');
    }

    const rows = await this.dataSource
      .getRepository(Order)
      .createQueryBuilder('order')
      .select(`DATE(CONVERT_TZ(order.created_at, '+00:00', '+09:00'))`, 'date')
      .addSelect(`COUNT(*)`, 'orderCount')
      .addSelect(`COALESCE(SUM(order.total_amount), 0)`, 'revenue')
      .where('order.created_at >= :startDate', {
        startDate,
      })
      .andWhere('order.created_at <= :endDate', {
        endDate,
      })
      .andWhere('order.payment_status = :paymentStatus', {
        paymentStatus: PaymentStatus.PAID,
      })
      .andWhere('order.status != :cancelled', {
        cancelled: OrderStatus.CANCELLED,
      })
      .groupBy(`DATE(CONVERT_TZ(order.created_at, '+00:00', '+09:00'))`)
      .orderBy('date', 'ASC')
      .getRawMany<RevenueChartRow>();

    const rowMap = new Map(
      rows.map((row) => [
        row.date,
        {
          date: row.date,
          orderCount: Number(row.orderCount),
          revenue: Number(row.revenue),
        },
      ]),
    );

    const items = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const date = this.formatDateInJapan(current);

      items.push(
        rowMap.get(date) ?? {
          date,
          orderCount: 0,
          revenue: 0,
        },
      );

      current.setUTCDate(current.getUTCDate() + 1);
    }

    return {
      from: this.formatDateInJapan(startDate),
      to: this.formatDateInJapan(endDate),
      currency: 'JPY',
      items,
    };
  }

  private formatDateInJapan(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  async getTopProducts(limit = 10) {
    const salesRows = await this.dataSource
      .getRepository(Order)
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .leftJoin('item.product', 'product')
      .select('item.productId', 'productId')
      .addSelect('item.productCode', 'productCode')
      .addSelect('item.productName', 'productName')
      .addSelect('SUM(item.quantity)', 'quantitySold')
      .addSelect('COUNT(DISTINCT order.id)', 'orderCount')
      .addSelect('SUM(item.subtotal)', 'revenue')
      .where('order.paymentStatus = :paid', {
        paid: PaymentStatus.PAID,
      })
      .andWhere('order.status != :cancelled', {
        cancelled: OrderStatus.CANCELLED,
      })
      .groupBy('item.productId')
      .addGroupBy('item.productCode')
      .addGroupBy('item.productName')
      .orderBy('quantitySold', 'DESC')
      .limit(limit)
      .getRawMany<ProductSalesRow>();

    const productIds = salesRows
      .map((row) => row.productId)
      .filter((id): id is string => Boolean(id));

    const reviewRows =
      productIds.length > 0
        ? await this.dataSource
            .getRepository(ProductReview)
            .createQueryBuilder('review')
            .select('review.productId', 'productId')
            .addSelect('COUNT(review.id)', 'reviewCount')
            .addSelect('AVG(review.rating)', 'averageRating')
            .where('review.productId IN (:...productIds)', {
              productIds,
            })
            .andWhere('review.status = :approved', {
              approved: ReviewStatus.APPROVED,
            })
            .andWhere('review.deletedAt IS NULL')
            .groupBy('review.productId')
            .getRawMany<ProductReviewSummaryRow>()
        : [];

    const reviewMap = new Map(
      reviewRows.map((row) => [
        String(row.productId),
        {
          reviewCount: Number(row.reviewCount),
          averageRating: Number(Number(row.averageRating).toFixed(1)),
        },
      ]),
    );

    return {
      items: salesRows.map((row) => {
        const review = reviewMap.get(String(row.productId));

        return {
          productId: row.productId,
          productCode: row.productCode,
          productName: row.productName,
          quantitySold: Number(row.quantitySold),
          orderCount: Number(row.orderCount),
          revenue: Number(row.revenue),
          averageRating: review?.averageRating ?? 0,
          reviewCount: review?.reviewCount ?? 0,
        };
      }),
    };
  }

  async getLowStockProducts(limit = 20) {
    const rows = await this.dataSource
      .getRepository(Inventory)
      .createQueryBuilder('inventory')
      .innerJoin('inventory.product', 'product')
      .leftJoin(
        ProductImage,
        'image',
        `
        image.product_id = product.id
        AND image.is_primary = true
        AND image.deleted_at IS NULL
      `,
      )
      .select([
        'inventory.id AS inventoryId',
        'inventory.product_id AS productId',

        'product.product_code AS productCode',
        'product.name AS productName',
        'product.slug AS slug',
        'product.status AS productStatus',

        'image.thumbnail_url AS thumbnailUrl',

        'inventory.stock_quantity AS stockQuantity',
        'inventory.reserved_quantity AS reservedQuantity',
        'inventory.low_stock_threshold AS lowStockThreshold',

        `(
        inventory.stock_quantity
        - inventory.reserved_quantity
      ) AS availableQuantity`,
      ])
      .where('inventory.is_stock_managed = :isStockManaged', {
        isStockManaged: true,
      })
      .andWhere('product.deleted_at IS NULL')
      .andWhere(
        `(
        inventory.stock_quantity
        - inventory.reserved_quantity
      ) <= inventory.low_stock_threshold`,
      )
      .orderBy(
        `CASE
        WHEN (
          inventory.stock_quantity
          - inventory.reserved_quantity
        ) <= 0
        THEN 0
        ELSE 1
      END`,
        'ASC',
      )
      .addOrderBy(
        `(
        inventory.stock_quantity
        - inventory.reserved_quantity
      )`,
        'ASC',
      )
      .addOrderBy('product.name', 'ASC')
      .limit(limit)
      .getRawMany<LowStockRow>();

    return {
      items: rows.map((row) => {
        const stockQuantity = Number(row.stockQuantity);

        const reservedQuantity = Number(row.reservedQuantity);

        const availableQuantity = Math.max(Number(row.availableQuantity), 0);

        const lowStockThreshold = Number(row.lowStockThreshold);

        return {
          inventoryId: row.inventoryId,

          product: {
            id: row.productId,
            productCode: row.productCode,
            name: row.productName,
            slug: row.slug,
            thumbnailUrl: row.thumbnailUrl ?? null,
            status: row.productStatus,
          },

          stockQuantity,
          reservedQuantity,
          availableQuantity,
          lowStockThreshold,

          stockStatus: availableQuantity <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        };
      }),
    };
  }

  async getRecentReviews(limit = 10) {
    const reviews = await this.dataSource.getRepository(ProductReview).find({
      where: {
        deletedAt: IsNull(),
      },
      relations: {
        product: true,
        user: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });

    return {
      items: reviews.map((review) => ({
        id: review.id,

        product: review.product
          ? {
              id: review.product.id,
              productCode: review.product.productCode,
              name: review.product.name,
            }
          : null,

        user: review.user
          ? {
              id: review.user.id,
              fullName: review.user.fullName,
              email: review.user.email,
            }
          : null,

        rating: review.rating,
        title: review.title,
        comment: review.comment,

        status: review.status,
        adminComment: review.adminComment,

        approvedAt: review.approvedAt,
        rejectedAt: review.rejectedAt,

        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      })),
    };
  }

  async getRecentUsers(limit = 10) {
    const users = await this.dataSource.getRepository(User).find({
      where: {
        deletedAt: IsNull(),
      },
      relations: {
        role: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });

    return {
      items: users.map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        status: user.status,

        role: user.role
          ? {
              id: user.role.id,
              roleCode: user.role.roleCode,
              roleName: user.role.roleName,
            }
          : null,

        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
    };
  }

  async getRecentNotifications(limit = 10) {
    const notifications = await this.dataSource
      .getRepository(Notification)
      .find({
        where: {
          deletedAt: IsNull(),
        },
        relations: {
          user: true,
        },
        order: {
          createdAt: 'DESC',
        },
        take: limit,
      });

    return {
      items: notifications.map((notification) => ({
        id: notification.id,

        user: notification.user
          ? {
              id: notification.user.id,
              fullName: notification.user.fullName,
              email: notification.user.email,
            }
          : null,

        type: notification.type,
        title: notification.title,
        message: notification.message,

        reference: notification.referenceType
          ? {
              type: notification.referenceType,
              id: notification.referenceId,
            }
          : null,

        isRead: notification.isRead,
        readAt: notification.readAt,

        createdAt: notification.createdAt,
      })),
    };
  }
}
