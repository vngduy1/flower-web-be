import { IsEnum, IsString } from 'class-validator';

import { PaymentMethod } from '../enums/payment-method.enum';

export class CreatePaymentDto {
  @IsString()
  orderId: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
