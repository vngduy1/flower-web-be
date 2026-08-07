import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';

import { Product } from '../products/entities/product.entity';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { ProductImage } from './entities/product-image.entity';
import {
  ProcessedProductImage,
  ProductImageProcessorService,
} from './services/product-image-processor.service';

@Injectable()
export class ProductImagesService {
  constructor(
    @InjectRepository(ProductImage)
    private readonly productImagesRepository: Repository<ProductImage>,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    private readonly dataSource: DataSource,

    private readonly imageProcessor: ProductImageProcessorService,
  ) {}

  async create(
    productId: string,
    file: Express.Multer.File,
    createProductImageDto: CreateProductImageDto,
  ): Promise<ProductImage> {
    await this.validateProduct(productId);

    let processedImage: ProcessedProductImage | undefined;

    try {
      processedImage = await this.imageProcessor.process(file);

      // Tạo biến const để TypeScript biết chắc chắn không phải undefined.
      const image = processedImage;

      return await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(ProductImage);

        const activeImageCount = await repository.count({
          where: {
            productId,
            deletedAt: IsNull(),
          },
        });

        let isPrimary = createProductImageDto.isPrimary ?? false;

        if (activeImageCount === 0) {
          isPrimary = true;
        }

        if (isPrimary) {
          await repository
            .createQueryBuilder()
            .update(ProductImage)
            .set({
              isPrimary: false,
            })
            .where('product_id = :productId', {
              productId,
            })
            .andWhere('deleted_at IS NULL')
            .execute();
        }

        const productImage = repository.create({
          productId,

          originalUrl: image.originalUrl,
          largeUrl: image.largeUrl,
          imageUrl: image.imageUrl,
          thumbnailUrl: image.thumbnailUrl,

          altText: createProductImageDto.altText?.trim() || null,

          sortOrder: createProductImageDto.sortOrder ?? 0,

          isPrimary,
        });

        return repository.save(productImage);
      });
    } catch (error) {
      if (processedImage) {
        await this.imageProcessor.deleteByUrls(processedImage);
      }

      throw error;
    }
  }

  async findAllByProduct(productId: string): Promise<ProductImage[]> {
    await this.validateProduct(productId);

    return this.productImagesRepository.find({
      where: {
        productId,
        deletedAt: IsNull(),
      },
      order: {
        isPrimary: 'DESC',
        sortOrder: 'ASC',
        id: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<ProductImage> {
    const productImage = await this.productImagesRepository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
      },
      relations: {
        product: true,
      },
    });

    if (!productImage) {
      throw new NotFoundException('Không tìm thấy ảnh sản phẩm');
    }

    return productImage;
  }

  async update(
    id: string,
    updateProductImageDto: UpdateProductImageDto,
  ): Promise<ProductImage> {
    const currentImage = await this.findOne(id);

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ProductImage);

      const productImage = await repository.findOne({
        where: {
          id,
          deletedAt: IsNull(),
        },
      });

      if (!productImage) {
        throw new NotFoundException('Không tìm thấy ảnh sản phẩm');
      }

      // Chuyển ảnh hiện tại thành ảnh chính.
      if (updateProductImageDto.isPrimary === true) {
        await repository
          .createQueryBuilder()
          .update(ProductImage)
          .set({
            isPrimary: false,
          })
          .where('product_id = :productId', {
            productId: currentImage.productId,
          })
          .andWhere('id != :id', {
            id,
          })
          .andWhere('deleted_at IS NULL')
          .execute();

        productImage.isPrimary = true;
      }

      // Không cho phép bỏ ảnh chính trực tiếp.
      // Cần chọn ảnh khác làm ảnh chính.
      if (updateProductImageDto.isPrimary === false && productImage.isPrimary) {
        throw new ConflictException(
          'Không thể bỏ ảnh chính trực tiếp. Hãy chọn ảnh khác làm ảnh chính',
        );
      }

      if (updateProductImageDto.altText !== undefined) {
        productImage.altText = updateProductImageDto.altText.trim() || null;
      }

      if (updateProductImageDto.sortOrder !== undefined) {
        productImage.sortOrder = updateProductImageDto.sortOrder;
      }

      return repository.save(productImage);
    });
  }

  async remove(id: string): Promise<void> {
    const productImage = await this.findOne(id);

    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ProductImage);

      await repository.softRemove(productImage);

      // Nếu ảnh bị xóa không phải ảnh chính,
      // không cần chọn ảnh thay thế.
      if (!productImage.isPrimary) {
        return;
      }

      const replacementImage = await repository.findOne({
        where: {
          productId: productImage.productId,
          deletedAt: IsNull(),
        },
        order: {
          sortOrder: 'ASC',
          id: 'ASC',
        },
      });

      // Chọn ảnh còn lại có thứ tự nhỏ nhất
      // làm ảnh chính.
      if (replacementImage) {
        replacementImage.isPrimary = true;

        await repository.save(replacementImage);
      }
    });
  }

  async restore(id: string): Promise<ProductImage> {
    const productImage = await this.productImagesRepository.findOne({
      where: {
        id,
      },
      withDeleted: true,
    });

    if (!productImage) {
      throw new NotFoundException('Không tìm thấy ảnh sản phẩm');
    }

    if (!productImage.deletedAt) {
      throw new ConflictException('Ảnh sản phẩm chưa bị xóa');
    }

    await this.validateProduct(productImage.productId);

    // Kiểm tra toàn bộ file ảnh vật lý.
    const filesExist = this.imageProcessor.filesExist({
      originalUrl: productImage.originalUrl,

      largeUrl: productImage.largeUrl,

      imageUrl: productImage.imageUrl,

      thumbnailUrl: productImage.thumbnailUrl,
    });

    if (!filesExist) {
      throw new ConflictException(
        'Một hoặc nhiều file ảnh vật lý không còn tồn tại',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ProductImage);

      await repository.restore(id);

      const restoredImage = await repository.findOne({
        where: {
          id,
          deletedAt: IsNull(),
        },
      });

      if (!restoredImage) {
        throw new NotFoundException('Không thể khôi phục ảnh sản phẩm');
      }

      const primaryImage = await repository.findOne({
        where: {
          productId: restoredImage.productId,
          isPrimary: true,
          deletedAt: IsNull(),
        },
      });

      // Nếu đã có ảnh chính khác,
      // ảnh được restore sẽ không là ảnh chính.
      if (primaryImage && primaryImage.id !== restoredImage.id) {
        restoredImage.isPrimary = false;

        return repository.save(restoredImage);
      }

      // Nếu chưa có ảnh chính,
      // ảnh restore trở thành ảnh chính.
      if (!primaryImage) {
        restoredImage.isPrimary = true;

        return repository.save(restoredImage);
      }

      return restoredImage;
    });
  }

  async hardDelete(id: string): Promise<void> {
    const productImage = await this.productImagesRepository.findOne({
      where: {
        id,
      },
      withDeleted: true,
    });

    if (!productImage) {
      throw new NotFoundException('Không tìm thấy ảnh sản phẩm');
    }

    const imageUrls = {
      originalUrl: productImage.originalUrl,

      largeUrl: productImage.largeUrl,

      imageUrl: productImage.imageUrl,

      thumbnailUrl: productImage.thumbnailUrl,
    };

    // Xóa record khỏi DB trước.
    await this.productImagesRepository.remove(productImage);

    // Sau đó xóa toàn bộ file vật lý.
    await this.imageProcessor.deleteByUrls(imageUrls);
  }

  private async validateProduct(productId: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: {
        id: productId,
        deletedAt: IsNull(),
      },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc đã bị xóa');
    }

    return product;
  }
}
