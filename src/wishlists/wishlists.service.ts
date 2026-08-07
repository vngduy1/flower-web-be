import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Product } from '../products/entities/product.entity';
import { ProductImage } from '../product-images/entities/product-image.entity';

import { WishlistItem } from './entities/wishlist-item.entity';

@Injectable()
export class WishlistsService {
  constructor(
    @InjectRepository(WishlistItem)
    private readonly wishlistRepository: Repository<WishlistItem>,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly productImagesRepository: Repository<ProductImage>,
  ) {}

  async add(userId: string, productId: string) {
    const product = await this.productsRepository.findOne({
      where: {
        id: productId,
        deletedAt: IsNull(),
      },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc đã bị xóa');
    }

    if (product.status !== 'ACTIVE') {
      throw new ConflictException('Sản phẩm hiện không được phép bán');
    }

    const existing = await this.wishlistRepository.findOne({
      where: {
        userId,
        productId,
      },
    });

    if (existing) {
      throw new ConflictException('Sản phẩm đã có trong danh sách yêu thích');
    }

    const wishlistItem = this.wishlistRepository.create({
      userId,
      productId,
    });

    const saved = await this.wishlistRepository.save(wishlistItem);

    return {
      message: 'Đã thêm sản phẩm vào danh sách yêu thích',
      id: saved.id,
      productId: saved.productId,
      createdAt: saved.createdAt,
    };
  }

  async findAll(userId: string) {
    const items = await this.wishlistRepository.find({
      where: {
        userId,
      },
      relations: {
        product: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    const productIds = items.map((item) => item.productId);

    const images =
      productIds.length > 0
        ? await this.productImagesRepository
            .createQueryBuilder('image')
            .where('image.product_id IN (:...productIds)', {
              productIds,
            })
            .andWhere('image.is_primary = :isPrimary', {
              isPrimary: true,
            })
            .andWhere('image.deleted_at IS NULL')
            .getMany()
        : [];

    const imageMap = new Map(images.map((image) => [image.productId, image]));

    return items.map((item) => {
      const product = item.product;
      const image = imageMap.get(item.productId);

      const currentPrice =
        product.salePrice !== null && product.salePrice !== undefined
          ? Number(product.salePrice)
          : Number(product.basePrice);

      return {
        id: item.id,
        product: {
          id: product.id,
          productCode: product.productCode,
          name: product.name,
          slug: product.slug,
          thumbnailUrl: image?.thumbnailUrl ?? null,
          basePrice: Number(product.basePrice),
          salePrice:
            product.salePrice !== null ? Number(product.salePrice) : null,
          currentPrice,
          status: product.status,
          isAvailable:
            product.status === 'ACTIVE' && product.deletedAt === null,
        },
        createdAt: item.createdAt,
      };
    });
  }

  async remove(userId: string, productId: string) {
    const result = await this.wishlistRepository.delete({
      userId,
      productId,
    });

    if (!result.affected) {
      throw new NotFoundException(
        'Sản phẩm không có trong danh sách yêu thích',
      );
    }

    return {
      message: 'Đã xóa sản phẩm khỏi danh sách yêu thích',
    };
  }

  async check(userId: string, productId: string) {
    const exists = await this.wishlistRepository.exists({
      where: {
        userId,
        productId,
      },
    });

    return {
      productId,
      isWishlisted: exists,
    };
  }
}
