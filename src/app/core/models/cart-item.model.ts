import { Product } from './product.model';

export type DiscountType = 'PERCENT' | 'FIXED';
export type OrderChannel = 'IN_STORE' | 'PHONE' | 'WEB' | 'OTHER';
export type DeliveryType = 'PICKUP' | 'DELIVERY';

export interface CartDiscount {
  type: DiscountType;
  value: number;
}

export interface DeliveryDetails {
  channel?: OrderChannel;
  deliveryType?: DeliveryType;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
}

interface BaseCartItem {
  id: string;
  quantity: number;
  unitPrice: number;
  isCustom: boolean;
}

export interface CatalogCartItem extends BaseCartItem {
  isCustom: false;
  product: Product;
}

export interface CustomCartItem extends BaseCartItem {
  isCustom: true;
  customName: string;
}

export type CartItem = CatalogCartItem | CustomCartItem;