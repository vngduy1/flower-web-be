import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * Public:
   * GET /api/products/:productId/reviews
   */
  @Get('products/:productId/reviews')
  findApprovedByProduct(@Param('productId') productId: string) {
    return this.reviewsService.findApprovedByProduct(productId);
  }

  /**
   * Customer:
   * POST /api/reviews
   */
  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  create(@Req() request: any, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(request.user.id, dto);
  }

  /**
   * Customer:
   * GET /api/reviews/my
   *
   * Phải khai báo trước route :id.
   */
  @Get('reviews/my')
  @UseGuards(JwtAuthGuard)
  findMyReviews(@Req() request: any) {
    return this.reviewsService.findMyReviews(request.user.id);
  }

  /**
   * Customer:
   * GET /api/reviews/:id
   */
  @Get('reviews/:id')
  @UseGuards(JwtAuthGuard)
  findMyReview(@Req() request: any, @Param('id') reviewId: string) {
    return this.reviewsService.findMyReview(request.user.id, reviewId);
  }

  /**
   * Customer:
   * PATCH /api/reviews/:id
   */
  @Patch('reviews/:id')
  @UseGuards(JwtAuthGuard)
  update(
    @Req() request: any,
    @Param('id') reviewId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(request.user.id, reviewId, dto);
  }

  /**
   * Customer:
   * DELETE /api/reviews/:id
   */
  @Delete('reviews/:id')
  @UseGuards(JwtAuthGuard)
  remove(@Req() request: any, @Param('id') reviewId: string) {
    return this.reviewsService.remove(request.user.id, reviewId);
  }
}
