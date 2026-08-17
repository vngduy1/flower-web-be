import { Test, TestingModule } from '@nestjs/testing';
import { OccasionsController } from './occasions.controller';

describe('OccasionsController', () => {
  let controller: OccasionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OccasionsController],
    }).compile();

    controller = module.get<OccasionsController>(OccasionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
