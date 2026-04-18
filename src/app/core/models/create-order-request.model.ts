import { DeliveryType, DiscountType, OrderChannel } from './cart-item.model';

export interface CreateCatalogOrderItem {
  isCustom: false;
  productId: string;
  quantity: number;
}

export interface CreateCustomOrderItem {
  isCustom: true;
  customName: string;
  quantity: number;
  unitPrice: number;
}

export type CreateOrderItem = CreateCatalogOrderItem | CreateCustomOrderItem;

export interface CreateOrderRequest {
  userId: number;
  channel: OrderChannel;
  deliveryType: DeliveryType;
  taxPercentage: number;
  discountType?: DiscountType;
  discountValue?: number;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
  items: CreateOrderItem[];
}

export interface CreateOrderResponse {
  id?: number | string;
  message?: string;
}