import { Test, TestingModule } from '@nestjs/testing';
import { OccasionsService } from './occasions.service';

describe('OccasionsService', () => {
  let service: OccasionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OccasionsService],
    }).compile();

    service = module.get<OccasionsService>(OccasionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
