import { BadRequestException, Injectable } from '@nestjs/common';

import { AddressesService } from '../addresses/addresses.service';
import { CartsService } from '../carts/carts.service';
import { DEFAULT_CURRENCY } from '../common/constants/currency.constant';

import { CheckoutPreviewDto } from './dto/checkout-preview.dto';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly cartsService: CartsService,
    private readonly addressesService: AddressesService,
  ) {}

  async preview(userId: string, dto: CheckoutPreviewDto) {
    /*
     * findOne() đồng thời kiểm tra:
     * - địa chỉ tồn tại
     * - địa chỉ thuộc user đang đăng nhập
     */
    const address = await this.addressesService.findOne(userId, dto.addressId);

    const cartData = await this.cartsService.getCartData(userId);

    if (cartData.items.length === 0) {
      throw new BadRequestException('Giỏ hàng đang trống');
    }

    const unavailableItems = cartData.items.filter((item) => !item.isAvailable);

    const priceChangedItems = cartData.items.filter(
      (item) => item.priceChanged,
    );

    const warnings: string[] = [];

    if (unavailableItems.length > 0) {
      warnings.push('Có sản phẩm không còn khả dụng hoặc không đủ tồn kho');
    }

    if (priceChangedItems.length > 0) {
      warnings.push('Giá của một số sản phẩm đã thay đổi');
    }

    const subtotal = cartData.subtotal;

    /*
     * Hiện tại dùng phí giao hàng tạm thời.
     * Sau này có thể chuyển sang bảng shipping_zones
     * hoặc delivery_fees.
     */
    const deliveryFee = this.calculateDeliveryFee(address.prefecture);

    const discountAmount = 0;

    const totalAmount = subtotal + deliveryFee - discountAmount;

    return {
      address: {
        id: address.id,
        label: address.label,
        recipientName: address.recipientName,
        recipientPhone: address.recipientPhone,
        postalCode: address.postalCode,
        prefecture: address.prefecture,
        city: address.city,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
      },

      items: cartData.items.map((item) => ({
        /*
         * ID của dòng trong giỏ hàng.
         */
        cartItemId: item.cartItem.id,

        productId: item.product.id,

        productCode: item.product.productCode,

        productName: item.product.name,

        thumbnailUrl: item.primaryImage?.thumbnailUrl ?? null,

        quantity: item.cartItem.quantity,

        storedUnitPrice: item.storedUnitPrice,

        currentUnitPrice: item.currentUnitPrice,

        unitPrice: item.currentUnitPrice,

        subtotal: item.subtotal,

        availableQuantity: item.availableQuantity,

        isAvailable: item.isAvailable,

        priceChanged: item.priceChanged,
      })),

      delivery: {
        date: dto.deliveryDate,
        timeSlot: dto.deliveryTimeSlot ?? null,
        fee: deliveryFee,
      },

      currency: DEFAULT_CURRENCY,

      subtotal,
      deliveryFee,
      discountAmount,
      totalAmount,

      canCheckout: unavailableItems.length === 0,

      warnings,
    };
  }

  private calculateDeliveryFee(prefecture: string): number {
    /*
     * Phí giao hàng tạm thời.
     */
    if (prefecture === '東京都' || prefecture === '神奈川県') {
      return 500;
    }

    return 800;
  }
}
