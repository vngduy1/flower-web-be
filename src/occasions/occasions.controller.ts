import { Controller, Get, Param } from '@nestjs/common';

import { OccasionsService } from './occasions.service';

@Controller('occasions')
export class OccasionsController {
  constructor(private readonly occasionsService: OccasionsService) {}

  @Get()
  findAll() {
    return this.occasionsService.findAll();
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.occasionsService.findBySlug(slug);
  }
}
