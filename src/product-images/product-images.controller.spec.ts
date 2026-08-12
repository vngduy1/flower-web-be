import { Test, TestingModule } from '@nestjs/testing';
import { ProductImagesController } from './product-images.controller';
import { ProductImagesService } from './product-images.service';

describe('ProductImagesController', () => {
  let controller: ProductImagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductImagesController],
      providers: [{ provide: ProductImagesService, useValue: {} }],
    }).compile();

    controller = module.get<ProductImagesController>(ProductImagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
