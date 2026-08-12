import { BadRequestException, Injectable } from '@nestjs/common';

import { AddressesService } from '../addresses/addresses.service';
import { CartsService } from '../carts/carts.service';
import { DEFAULT_CURRENCY } from '../common/constants/currency.constant';
import { DeliveryAreasService } from '../deliveries/delivery-areas.service';

import { CheckoutPreviewDto } from './dto/checkout-preview.dto';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly cartsService: CartsService,
    private readonly addressesService: AddressesService,
    private readonly deliveryAreasService: DeliveryAreasService,
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
     * 配送先住所から配送エリアを取得する。
     *
     * 例:
     * user_addresses.city = 川崎市幸区
     *
     * delivery_areas:
     * city      = 川崎市
     * area_name = 幸区
     */
    const deliveryArea = await this.deliveryAreasService.findByAddress(
      address.prefecture,
      address.city,
    );

    if (!deliveryArea) {
      throw new BadRequestException(
        '選択されたお届け先は、現在配送対象エリア外です。',
      );
    }

    /*
     * 配送料は delivery_areas の設定値を使用する。
     */
    const deliveryFee = deliveryArea.deliveryFee;

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

        // Có thể thêm để frontend biết khu vực nào được match
        area: {
          id: deliveryArea.id,
          prefecture: deliveryArea.prefecture,
          city: deliveryArea.city,
          areaName: deliveryArea.areaName,
        },
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
}
