/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductImagesService } from './product-images.service';
import { ProductImageProcessorService } from './services/product-image-processor.service';
import { NotFoundException } from '@nestjs/common';
import { ProductStatus } from '../products/enums/product-status.enum';

describe('ProductImagesService', () => {
  let service: ProductImagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductImagesService,
        { provide: getRepositoryToken(ProductImage), useValue: {} },
        { provide: getRepositoryToken(Product), useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: ProductImageProcessorService, useValue: {} },
      ],
    }).compile();

    service = module.get<ProductImagesService>(ProductImagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('locks the product before assigning a primary image', async () => {
    const product = { id: '4', deletedAt: null } as Product;
    const productsRepository = {
      findOne: jest.fn().mockResolvedValue(product),
    } as unknown as Repository<Product>;
    const updateBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    const imageRepository = {
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn().mockReturnValue(updateBuilder),
      create: jest.fn().mockImplementation((value: ProductImage) => value),
      save: jest.fn().mockImplementation((value: ProductImage) => value),
    };
    const transactionProductRepository = {
      findOne: jest.fn().mockResolvedValue(product),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === Product ? transactionProductRepository : imageRepository,
      ),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(
        (callback: (entityManager: EntityManager) => Promise<ProductImage>) =>
          callback(manager),
      ),
    } as unknown as DataSource;
    const imageProcessor = {
      process: jest.fn().mockResolvedValue({
        originalUrl: '/original.webp',
        largeUrl: '/large.webp',
        imageUrl: '/image.webp',
        thumbnailUrl: '/thumb.webp',
      }),
      deleteByUrls: jest.fn(),
    } as unknown as ProductImageProcessorService;
    const imageService = new ProductImagesService(
      {} as Repository<ProductImage>,
      productsRepository,
      dataSource,
      imageProcessor,
    );

    await imageService.create('4', {} as Express.Multer.File, {});

    expect(transactionProductRepository.findOne).toHaveBeenCalledWith({
      where: { id: '4' },
      withDeleted: true,
      lock: { mode: 'pessimistic_write' },
    });
    expect(imageRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ productId: '4', isPrimary: true }),
    );
  });

  it('does not expose images for a non-public product', async () => {
    const imageRepository = {
      find: jest.fn(),
    } as unknown as Repository<ProductImage>;
    const productsRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: '4',
        status: ProductStatus.DRAFT,
        deletedAt: null,
      }),
    } as unknown as Repository<Product>;
    const imageService = new ProductImagesService(
      imageRepository,
      productsRepository,
      {} as DataSource,
      {} as ProductImageProcessorService,
    );

    await expect(imageService.findAllByProduct('4')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(imageRepository.find).not.toHaveBeenCalled();
  });

  it('locks the product and replaces an active primary image on hard delete', async () => {
    const currentImage = {
      id: '8',
      productId: '4',
      originalUrl: '/original-8.webp',
      largeUrl: '/large-8.webp',
      imageUrl: '/image-8.webp',
      thumbnailUrl: '/thumb-8.webp',
      isPrimary: true,
      deletedAt: null,
    } as ProductImage;
    const replacementImage = {
      id: '9',
      productId: '4',
      isPrimary: false,
      deletedAt: null,
    } as ProductImage;
    const imageRepository = {
      findOne: jest.fn().mockResolvedValue(currentImage),
    } as unknown as Repository<ProductImage>;
    const transactionImageRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(currentImage)
        .mockResolvedValueOnce(replacementImage),
      remove: jest.fn().mockResolvedValue(currentImage),
      save: jest.fn().mockImplementation((value: ProductImage) => value),
    };
    const transactionProductRepository = {
      findOne: jest.fn().mockResolvedValue({ id: '4', deletedAt: null }),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === Product
          ? transactionProductRepository
          : transactionImageRepository,
      ),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(
        (callback: (entityManager: EntityManager) => Promise<unknown>) =>
          callback(manager),
      ),
    } as unknown as DataSource;
    const imageProcessor = {
      deleteByUrls: jest.fn().mockResolvedValue(undefined),
    } as unknown as ProductImageProcessorService;
    const imageService = new ProductImagesService(
      imageRepository,
      {} as Repository<Product>,
      dataSource,
      imageProcessor,
    );

    await imageService.hardDelete('8');

    expect(transactionProductRepository.findOne).toHaveBeenCalledWith({
      where: { id: '4' },
      withDeleted: true,
      lock: { mode: 'pessimistic_write' },
    });
    expect(transactionImageRepository.remove).toHaveBeenCalledWith(
      currentImage,
    );
    expect(replacementImage.isPrimary).toBe(true);
    expect(transactionImageRepository.save).toHaveBeenCalledWith(
      replacementImage,
    );
    expect(imageProcessor.deleteByUrls).toHaveBeenCalledWith({
      originalUrl: '/original-8.webp',
      largeUrl: '/large-8.webp',
      imageUrl: '/image-8.webp',
      thumbnailUrl: '/thumb-8.webp',
    });
  });
});
