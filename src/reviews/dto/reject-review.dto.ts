import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectReviewDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  adminComment!: string;
}
