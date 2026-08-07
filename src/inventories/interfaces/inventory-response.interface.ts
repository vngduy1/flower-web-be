export interface InventoryItemResponse {
  id: string;
  productId: string;
  productCode: string | null;
  productName: string | null;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  isStockManaged: boolean;
  isLowStock: boolean;
  isOutOfStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedInventoryResponse {
  data: InventoryItemResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
