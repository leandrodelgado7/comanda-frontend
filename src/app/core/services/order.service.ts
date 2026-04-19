import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { OrderItem } from '../models/order-item.model';
import { Product } from '../models/product.model';
import { environment } from '../../../environments/environment';

export interface CreateOrderCatalogItemRequest {
  isCustom: false;
  productId: number;
  quantity: number;
}

export interface CreateOrderCustomItemRequest {
  isCustom: true;
  customName: string;
  quantity: number;
  unitPrice: number;
}

export type CreateOrderItemRequest =
  | CreateOrderCatalogItemRequest
  | CreateOrderCustomItemRequest;

export interface CreateOrderRequest {
  userId: number;
  channel: 'IN_STORE';
  deliveryType: 'PICKUP';
  taxPercentage: number;
  discountType: string | null;
  discountValue: number | null;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  deliveryNotes: string | null;
  items: CreateOrderItemRequest[];
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly ordersEndpoint = environment.ordersApiUrl;
  private readonly itemsSubject = new BehaviorSubject<OrderItem[]>([]);
  private nextItemSequence = 0;
  readonly items$ = this.itemsSubject.asObservable();
  readonly total$ = this.items$.pipe(
    map((items) => items.reduce((acc, item) => acc + this.getItemTotal(item), 0))
  );

  constructor(private readonly http: HttpClient) {}

  addProduct(product: Product): void {
    this.addProductWithQuantity(product, 1);
  }

  addProductWithQuantity(product: Product, quantity: number): void {
    if (quantity <= 0) {
      return;
    }

    if (!product.disponible) {
      return;
    }

    if (product.saleUnit === 'FRACTION') {
      this.addFractionProducts(product, quantity);
      return;
    }

    const currentItems = this.itemsSubject.getValue();
    const existingItem = currentItems.find((item) => item.product.id === product.id);

    if (existingItem) {
      this.changeQuantity(existingItem.id, existingItem.quantity + quantity);
      return;
    }

    this.itemsSubject.next([
      ...currentItems,
      {
        id: this.buildItemId(product.id),
        product,
        quantity
      }
    ]);
  }

  changeQuantity(itemId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeProduct(itemId);
      return;
    }

    const updatedItems = this.itemsSubject.getValue().map((item) =>
      item.id === itemId ? { ...item, quantity } : item
    );

    this.itemsSubject.next(updatedItems);
  }

  updateFractionWeight(itemId: string, weightGrams: number): void {
    const normalizedWeightGrams = Number.isFinite(weightGrams)
      ? Math.max(0, Math.round(weightGrams))
      : 0;

    const updatedItems = this.itemsSubject.getValue().map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return {
        ...item,
        weightGrams: normalizedWeightGrams,
        quantity: normalizedWeightGrams / 1000
      };
    });

    this.itemsSubject.next(updatedItems);
  }

  removeProduct(itemId: string): void {
    const updatedItems = this.itemsSubject
      .getValue()
      .filter((item) => item.id !== itemId);

    this.itemsSubject.next(updatedItems);
  }

  clearOrder(): void {
    this.itemsSubject.next([]);
  }

  getCurrentTotal(): number {
    return this.itemsSubject
      .getValue()
      .reduce((acc, item) => acc + this.getItemTotal(item), 0);
  }

  getCurrentItems(): OrderItem[] {
    return this.itemsSubject.getValue();
  }

  crearPedido(request: CreateOrderRequest): Observable<unknown> {
    return this.http.post(this.ordersEndpoint, request);
  }

  private addFractionProducts(product: Product, quantity: number): void {
    const additions = Array.from({ length: Math.floor(quantity) }, () => ({
      id: this.buildItemId(product.id),
      product,
      quantity: 0,
      weightGrams: 0
    }));

    if (additions.length === 0) {
      return;
    }

    this.itemsSubject.next([...this.itemsSubject.getValue(), ...additions]);
  }

  private buildItemId(productId: string): string {
    this.nextItemSequence += 1;
    return `${productId}-${this.nextItemSequence}`;
  }

  private getItemTotal(item: OrderItem): number {
    return item.product.precio * item.quantity;
  }
}
