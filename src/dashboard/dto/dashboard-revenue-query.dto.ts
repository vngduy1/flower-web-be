import { IsDateString, IsOptional } from 'class-validator';

export class DashboardRevenueQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
