import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';

import { NotificationQueryDto } from './dto/notification-query.dto';
import { Notification } from './entities/notification.entity';
import { NotificationType } from './enums/notification-type.enum';
import { User } from 'src/users/entities/user.entity';

export type CreateNotificationParams = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceType?: string | null;
  referenceId?: string | null;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async createAdminNotificationsWithManager(
    manager: EntityManager,
    params: Omit<CreateNotificationParams, 'userId'>,
  ): Promise<void> {
    const admins = await manager
      .getRepository(User)
      .createQueryBuilder('user')
      .innerJoin('user.role', 'role')
      .where('role.roleCode = :roleCode', {
        roleCode: 'ADMIN',
      })
      .andWhere('user.deletedAt IS NULL')
      .getMany();

    if (admins.length === 0) {
      return;
    }

    const notificationRepository = manager.getRepository(Notification);

    const notifications = admins.map((admin) =>
      notificationRepository.create({
        userId: admin.id,
        type: params.type,
        title: params.title.trim(),
        message: params.message.trim(),
        referenceType: params.referenceType?.trim() || null,
        referenceId: params.referenceId ?? null,
        isRead: false,
        readAt: null,
      }),
    );

    await notificationRepository.save(notifications);
  }

  /**
   * Dùng nội bộ từ OrdersService, PaymentsService,
   * ReviewsService và các module khác.
   */
  async createNotification(
    params: CreateNotificationParams,
  ): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      userId: params.userId,
      type: params.type,
      title: params.title.trim(),
      message: params.message.trim(),
      referenceType: params.referenceType?.trim() || null,
      referenceId: params.referenceId ?? null,
      isRead: false,
      readAt: null,
    });

    return this.notificationsRepository.save(notification);
  }

  async createWithManager(
    manager: EntityManager,
    params: CreateNotificationParams,
  ): Promise<Notification> {
    const notificationRepository = manager.getRepository(Notification);

    const notification = notificationRepository.create({
      userId: params.userId,
      type: params.type,
      title: params.title.trim(),
      message: params.message.trim(),
      referenceType: params.referenceType?.trim() || null,
      referenceId: params.referenceId ?? null,
      isRead: false,
      readAt: null,
    });

    return notificationRepository.save(notification);
  }

  /**
   * Lấy danh sách thông báo của user hiện tại.
   */
  async findAll(userId: string, query: NotificationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', {
        userId,
      })
      .andWhere('notification.deletedAt IS NULL')
      .orderBy('notification.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.unreadOnly === true) {
      queryBuilder.andWhere('notification.isRead = :isRead', {
        isRead: false,
      });
    }

    const [notifications, total] = await queryBuilder.getManyAndCount();

    const unreadCount = await this.notificationsRepository.count({
      where: {
        userId,
        isRead: false,
        deletedAt: IsNull(),
      },
    });

    return {
      items: notifications.map((item) => this.buildResponse(item)),
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lấy chi tiết một thông báo thuộc user hiện tại.
   */
  async findOne(userId: string, notificationId: string) {
    const notification = await this.findOwnedNotification(
      userId,
      notificationId,
    );

    return this.buildResponse(notification);
  }

  /**
   * Lấy số lượng thông báo chưa đọc.
   */
  async getUnreadCount(userId: string) {
    const unreadCount = await this.notificationsRepository.count({
      where: {
        userId,
        isRead: false,
        deletedAt: IsNull(),
      },
    });

    return {
      unreadCount,
    };
  }

  /**
   * Đánh dấu một thông báo là đã đọc.
   */
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.findOwnedNotification(
      userId,
      notificationId,
    );

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();

      await this.notificationsRepository.save(notification);
    }

    return this.buildResponse(notification);
  }

  /**
   * Đánh dấu tất cả thông báo của user là đã đọc.
   */
  async markAllAsRead(userId: string) {
    const now = new Date();

    const result = await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({
        isRead: true,
        readAt: now,
      })
      .where('user_id = :userId', {
        userId,
      })
      .andWhere('is_read = :isRead', {
        isRead: false,
      })
      .andWhere('deleted_at IS NULL')
      .execute();

    return {
      message: 'Đã đánh dấu tất cả thông báo là đã đọc',
      updatedCount: result.affected ?? 0,
    };
  }

  /**
   * Xóa mềm một thông báo thuộc user hiện tại.
   */
  async remove(userId: string, notificationId: string) {
    const notification = await this.findOwnedNotification(
      userId,
      notificationId,
    );

    await this.notificationsRepository.softRemove(notification);

    return {
      message: 'Đã xóa thông báo',
    };
  }

  private async findOwnedNotification(
    userId: string,
    notificationId: string,
  ): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: {
        id: notificationId,
        userId,
        deletedAt: IsNull(),
      },
    });

    if (!notification) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }

    return notification;
  }

  private buildResponse(notification: Notification) {
    return {
      id: notification.id,
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
      updatedAt: notification.updatedAt,
    };
  }
}
