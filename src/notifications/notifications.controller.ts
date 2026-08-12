import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /api/notifications
   *
   * Ví dụ:
   * GET /api/notifications?page=1&limit=20
   * GET /api/notifications?unreadOnly=true
   */
  @Get()
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationsService.findAll(request.user.id, query);
  }

  /**
   * GET /api/notifications/unread-count
   *
   * Route này phải đặt trước :id.
   */
  @Get('unread-count')
  getUnreadCount(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.getUnreadCount(request.user.id);
  }

  /**
   * GET /api/notifications/:id
   */
  @Get(':id')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.findOne(request.user.id, notificationId);
  }

  /**
   * PATCH /api/notifications/read-all
   *
   * Route này phải đặt trước :id/read.
   */
  @Patch('read-all')
  markAllAsRead(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(request.user.id);
  }

  /**
   * PATCH /api/notifications/:id/read
   */
  @Patch(':id/read')
  markAsRead(
    @Req() request: AuthenticatedRequest,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(
      request.user.id,
      notificationId,
    );
  }

  /**
   * DELETE /api/notifications/:id
   */
  @Delete(':id')
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.remove(request.user.id, notificationId);
  }
}
