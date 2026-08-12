import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';

import { DEFAULT_CURRENCY } from '../common/constants/currency.constant';
import { Inventory } from '../inventories/entities/inventory.entity';
import { ProductImage } from '../product-images/entities/product-image.entity';
import { Product } from '../products/entities/product.entity';
import { ProductStatus } from '../products/enums/product-status.enum';

import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItem } from './entities/cart-item.entity';
import { Cart } from './entities/cart.entity';

export interface CartDataItem {
  cartItem: CartItem;
  product: Product;
  inventory: Inventory | null;
  primaryImage: ProductImage | null;
  currentUnitPrice: number;
  storedUnitPrice: number;
  availableQuantity: number;
  subtotal: number;
  priceChanged: boolean;
  isAvailable: boolean;
}

export interface CartData {
  cart: Cart;
  items: CartDataItem[];
  totalQuantity: number;
  subtotal: number;
}

@Injectable()
export class CartsService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartsRepository: Repository<Cart>,

    @InjectRepository(CartItem)
    private readonly cartItemsRepository: Repository<CartItem>,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(Inventory)
    private readonly inventoriesRepository: Repository<Inventory>,

    @InjectRepository(ProductImage)
    private readonly productImagesRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * API trả thông tin giỏ hàng.
   */
  async getCart(userId: string) {
    const cartData = await this.getCartData(userId);

    return this.buildCartResponse(cartData);
  }

  /**
   * Lấy dữ liệu nghiệp vụ của giỏ hàng.
   *
   * Checkout và Order có thể gọi trực tiếp method này.
   */
  async getCartData(userId: string): Promise<CartData> {
    const cart = await this.getOrCreateCart(userId);

    const cartItems = await this.cartItemsRepository.find({
      where: {
        cartId: cart.id,
      },
      relations: {
        product: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    if (cartItems.length === 0) {
      return {
        cart,
        items: [],
        totalQuantity: 0,
        subtotal: 0,
      };
    }

    const productIds = [...new Set(cartItems.map((item) => item.productId))];

    const [inventories, primaryImages] = await Promise.all([
      this.inventoriesRepository
        .createQueryBuilder('inventory')
        .where('inventory.product_id IN (:...productIds)', {
          productIds,
        })
        .getMany(),

      this.productImagesRepository
        .createQueryBuilder('image')
        .where('image.product_id IN (:...productIds)', {
          productIds,
        })
        .andWhere('image.is_primary = :isPrimary', {
          isPrimary: true,
        })
        .andWhere('image.deleted_at IS NULL')
        .getMany(),
    ]);

    const inventoryMap = new Map<string, Inventory>(
      inventories.map((inventory) => [inventory.productId, inventory]),
    );

    const imageMap = new Map<string, ProductImage>(
      primaryImages.map((image) => [image.productId, image]),
    );

    let totalQuantity = 0;
    let subtotal = 0;

    const items: CartDataItem[] = cartItems.map((cartItem) => {
      const product = cartItem.product;

      const inventory = inventoryMap.get(cartItem.productId) ?? null;

      const primaryImage = imageMap.get(cartItem.productId) ?? null;

      const currentUnitPrice = this.getProductPrice(product);

      const storedUnitPrice = Number(cartItem.unitPrice);

      const availableQuantity = this.getAvailableQuantity(inventory);

      const itemSubtotal = currentUnitPrice * cartItem.quantity;

      const priceChanged = storedUnitPrice !== currentUnitPrice;

      const isProductActive =
        product.deletedAt === null && product.status === ProductStatus.ACTIVE;

      const hasEnoughStock =
        inventory !== null && cartItem.quantity <= availableQuantity;

      const isAvailable = isProductActive && hasEnoughStock;

      totalQuantity += cartItem.quantity;
      subtotal += itemSubtotal;

      return {
        cartItem,
        product,
        inventory,
        primaryImage,
        currentUnitPrice,
        storedUnitPrice,
        availableQuantity,
        subtotal: itemSubtotal,
        priceChanged,
        isAvailable,
      };
    });

    return {
      cart,
      items,
      totalQuantity,
      subtotal,
    };
  }

  /**
   * Dựng response dành cho API Cart.
   */
  buildCartResponse(cartData: CartData) {
    const { cart, items, totalQuantity, subtotal } = cartData;

    return {
      id: cart.id,
      userId: cart.userId,

      currency: DEFAULT_CURRENCY,

      items: items.map((item) => ({
        id: item.cartItem.id,
        productId: item.product.id,
        productCode: item.product.productCode,
        productName: item.product.name,

        thumbnailUrl: item.primaryImage?.thumbnailUrl ?? null,

        storedUnitPrice: item.storedUnitPrice,

        currentUnitPrice: item.currentUnitPrice,

        priceChanged: item.priceChanged,

        quantity: item.cartItem.quantity,

        subtotal: item.subtotal,

        availableQuantity: item.availableQuantity,

        isAvailable: item.isAvailable,
      })),

      totalQuantity,
      totalPrice: subtotal,

      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  async addItem(userId: string, addCartItemDto: AddCartItemDto) {
    const product = await this.findActiveProduct(addCartItemDto.productId);

    const inventory = await this.findInventory(product.id);

    this.validateAvailableQuantity(inventory, addCartItemDto.quantity);

    await this.dataSource.transaction(async (manager) => {
      const cartRepository = manager.getRepository(Cart);

      const itemRepository = manager.getRepository(CartItem);

      let cart = await cartRepository.findOne({
        where: {
          userId,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!cart) {
        cart = cartRepository.create({
          userId,
        });

        cart = await cartRepository.save(cart);
      }

      const existingItem = await itemRepository.findOne({
        where: {
          cartId: cart.id,
          productId: product.id,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      const currentPrice = this.getProductPrice(product);

      if (existingItem) {
        const newQuantity = existingItem.quantity + addCartItemDto.quantity;

        this.validateAvailableQuantity(inventory, newQuantity);

        existingItem.quantity = newQuantity;

        existingItem.unitPrice = currentPrice.toFixed(2);

        await itemRepository.save(existingItem);
      } else {
        const cartItem = itemRepository.create({
          cartId: cart.id,
          productId: product.id,
          quantity: addCartItemDto.quantity,
          unitPrice: currentPrice.toFixed(2),
        });

        await itemRepository.save(cartItem);
      }
    });

    return this.getCart(userId);
  }

  async updateItem(
    userId: string,
    itemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.cartItemsRepository.findOne({
      where: {
        id: itemId,
        cartId: cart.id,
      },
      relations: {
        product: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');
    }

    if (
      item.product.deletedAt !== null ||
      item.product.status !== ProductStatus.ACTIVE
    ) {
      throw new ConflictException('Sản phẩm hiện không được phép bán');
    }

    const inventory = await this.findInventory(item.productId);

    this.validateAvailableQuantity(inventory, updateCartItemDto.quantity);

    item.quantity = updateCartItemDto.quantity;

    item.unitPrice = this.getProductPrice(item.product).toFixed(2);

    await this.cartItemsRepository.save(item);

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);

    const result = await this.cartItemsRepository.delete({
      id: itemId,
      cartId: cart.id,
    });

    if (!result.affected) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');
    }

    return this.getCart(userId);
  }

  async clear(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    await this.cartItemsRepository.delete({
      cartId: cart.id,
    });

    return {
      message: 'Đã xóa toàn bộ sản phẩm trong giỏ hàng',
    };
  }

  private async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartsRepository.findOne({
      where: {
        userId,
      },
    });

    if (!cart) {
      cart = this.cartsRepository.create({
        userId,
      });

      try {
        cart = await this.cartsRepository.save(cart);
      } catch (error) {
        /*
         * Phòng trường hợp hai request đồng thời
         * cùng tạo cart cho một user.
         */
        const existingCart = await this.cartsRepository.findOne({
          where: {
            userId,
          },
        });

        if (existingCart) {
          return existingCart;
        }

        throw error;
      }
    }

    return cart;
  }

  private async findActiveProduct(productId: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: {
        id: productId,
        deletedAt: IsNull(),
      },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc đã bị xóa');
    }

    if (product.status !== ProductStatus.ACTIVE) {
      throw new ConflictException('Sản phẩm hiện không được phép bán');
    }

    return product;
  }

  private async findInventory(productId: string): Promise<Inventory> {
    const inventory = await this.inventoriesRepository.findOne({
      where: {
        productId,
      },
    });

    if (!inventory) {
      throw new ConflictException('Sản phẩm chưa có thông tin tồn kho');
    }

    return inventory;
  }

  private validateAvailableQuantity(
    inventory: Inventory,
    requestedQuantity: number,
  ): void {
    if (!inventory.isStockManaged) {
      return;
    }

    const availableQuantity = this.getAvailableQuantity(inventory);

    if (requestedQuantity > availableQuantity) {
      throw new ConflictException(
        `Không đủ hàng. Số lượng hiện có thể thêm: ${availableQuantity}`,
      );
    }
  }

  private getAvailableQuantity(inventory: Inventory | null): number {
    if (!inventory) {
      return 0;
    }

    if (!inventory.isStockManaged) {
      /*
       * Không nên trả Number.MAX_SAFE_INTEGER
       * ra frontend vì nhìn không tự nhiên.
       *
       * Ở đây vẫn dùng để logic quantity
       * luôn được xem là đủ.
       */
      return Number.MAX_SAFE_INTEGER;
    }

    return Math.max(inventory.stockQuantity - inventory.reservedQuantity, 0);
  }

  private getProductPrice(product: Product): number {
    const salePrice =
      product.salePrice !== null && product.salePrice !== undefined
        ? Number(product.salePrice)
        : null;

    if (salePrice !== null && salePrice >= 0) {
      return salePrice;
    }

    return Number(product.basePrice);
  }
}
