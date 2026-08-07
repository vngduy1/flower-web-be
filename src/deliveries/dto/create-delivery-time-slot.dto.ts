import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDeliveryTimeSlotDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'slotCode chỉ được chứa chữ in hoa, số và dấu gạch dưới',
  })
  slotCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime phải có định dạng HH:mm',
  })
  startTime!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime phải có định dạng HH:mm',
  })
  endTime!: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  defaultCapacity!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
