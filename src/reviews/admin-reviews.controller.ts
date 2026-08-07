import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { RoleCode } from '../auth/enums/role-code.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { AdminReviewQueryDto } from './dto/admin-review-query.dto';
import { RejectReviewDto } from './dto/reject-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN)
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  findAll(@Query() query: AdminReviewQueryDto) {
    return this.reviewsService.adminFindAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reviewsService.adminFindOne(id);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.reviewsService.approve(id);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectReviewDto) {
    return this.reviewsService.reject(id, dto);
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.reviewsService.adminRestore(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reviewsService.adminRemove(id);
  }
}
