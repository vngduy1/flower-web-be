import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Roles } from '../auth/decorators/roles.decorator';
import { RoleCode } from '../auth/enums/role-code.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { productImageUploadOptions } from './config/product-image-upload.config';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { ProductImagesService } from './product-images.service';

@Controller()
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  /**
   * Upload ảnh cho sản phẩm.
   *
   * POST /api/products/:productId/images
   */
  @Post('products/:productId/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  @UseInterceptors(FileInterceptor('image', productImageUploadOptions))
  create(
    @Param('productId')
    productId: string,

    @UploadedFile()
    file: Express.Multer.File,

    @Body()
    createProductImageDto: CreateProductImageDto,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file ảnh');
    }

    return this.productImagesService.create(
      productId,
      file,
      createProductImageDto,
    );
  }

  /**
   * Lấy danh sách ảnh đang hoạt động của sản phẩm.
   *
   * GET /api/products/:productId/images
   */
  @Get('products/:productId/images')
  findAllByProduct(
    @Param('productId')
    productId: string,
  ) {
    return this.productImagesService.findAllByProduct(productId);
  }

  /**
   * Lấy chi tiết một ảnh.
   *
   * GET /api/product-images/:id
   */
  @Get('product-images/:id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.productImagesService.findOne(id);
  }

  /**
   * Cập nhật thông tin ảnh.
   *
   * PATCH /api/product-images/:id
   */
  @Patch('product-images/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  update(
    @Param('id')
    id: string,

    @Body()
    updateProductImageDto: UpdateProductImageDto,
  ) {
    return this.productImagesService.update(id, updateProductImageDto);
  }

  /**
   * Xóa mềm ảnh.
   *
   * DELETE /api/product-images/:id
   */
  @Delete('product-images/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  async remove(
    @Param('id')
    id: string,
  ) {
    await this.productImagesService.remove(id);

    return {
      message: 'Xóa ảnh sản phẩm thành công',
    };
  }

  /**
   * Khôi phục ảnh đã xóa mềm.
   *
   * PATCH /api/product-images/:id/restore
   */
  @Patch('product-images/:id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleCode.ADMIN, RoleCode.STAFF)
  restore(
    @Param('id')
    id: string,
  ) {
    return this.productImagesService.restore(id);
  }

  /**
   * Xóa vĩnh viễn record và toàn bộ file ảnh vật lý.
   *
   * DELETE /api/product-images/:id/permanent
   *
   * Chỉ ADMIN được phép thực hiện.
   */
  @Delete('product-images/:id/permanent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleCode.ADMIN)
  async hardDelete(
    @Param('id')
    id: string,
  ) {
    await this.productImagesService.hardDelete(id);

    return {
      message: 'Xóa vĩnh viễn ảnh sản phẩm thành công',
    };
  }
}
