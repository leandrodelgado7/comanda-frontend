import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import {
  CartDiscount,
  CartItem,
  DeliveryDetails
} from '../models/cart-item.model';
import { Product } from '../models/product.model';

interface CartSnapshot {
  items: CartItem[];
  discount: CartDiscount | null;
  deliveryDetails: DeliveryDetails | null;
  taxPercentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class CarritoService {
  private readonly defaultTaxPercentage = 21;
  private readonly itemsSubject = new BehaviorSubject<CartItem[]>([]);
  private readonly discountSubject = new BehaviorSubject<CartDiscount | null>(null);
  private readonly deliveryDetailsSubject = new BehaviorSubject<DeliveryDetails | null>(null);
  private readonly taxPercentageSubject = new BehaviorSubject<number>(this.defaultTaxPercentage);

  readonly items$ = this.itemsSubject.asObservable();
  readonly discount$ = this.discountSubject.asObservable();
  readonly deliveryDetails$ = this.deliveryDetailsSubject.asObservable();
  readonly taxPercentage$ = this.taxPercentageSubject.asObservable();
  readonly itemCount$ = this.items$.pipe(
    map((items) => items.reduce((acc, item) => acc + item.quantity, 0))
  );
  readonly subtotal$ = this.items$.pipe(
    map((items) => items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0))
  );
  readonly discountAmount$ = combineLatest([this.subtotal$, this.discount$]).pipe(
    map(([subtotal, discount]) => this.calculateDiscountAmount(subtotal, discount))
  );
  readonly taxAmount$ = this.subtotal$.pipe(
    map((subtotal) => subtotal * (this.taxPercentageSubject.getValue() / 100))
  );
  readonly total$ = combineLatest([this.subtotal$, this.taxAmount$, this.discountAmount$]).pipe(
    map(([subtotal, taxAmount, discountAmount]) => Math.max(subtotal + taxAmount - discountAmount, 0))
  );

  addProduct(product: Product): void {
    this.addProductWithQuantity(product, 1);
  }

  addProductWithQuantity(product: Product, quantity: number): void {
    if (!product.disponible || quantity <= 0) {
      return;
    }

    const currentItems = this.itemsSubject.getValue();
    const existingItem = currentItems.find(
      (item) => !item.isCustom && item.product.id === product.id
    );

    if (existingItem) {
      this.changeQuantity(existingItem.id, existingItem.quantity + quantity);
      return;
    }

    this.itemsSubject.next([
      ...currentItems,
      {
        id: `catalog:${String(product.id)}`,
        isCustom: false,
        product,
        quantity,
        unitPrice: product.precio
      }
    ]);
  }

  addCustomItem(customName: string, unitPrice: number, quantity = 1): void {
    const normalizedName = customName.trim();
    if (!normalizedName || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      return;
    }

    const normalizedPrice = Number(unitPrice.toFixed(2));
    const itemId = this.buildCustomItemId(normalizedName, normalizedPrice);
    const currentItems = this.itemsSubject.getValue();
    const existingItem = currentItems.find((item) => item.id === itemId);

    if (existingItem) {
      this.changeQuantity(existingItem.id, existingItem.quantity + quantity);
      return;
    }

    this.itemsSubject.next([
      ...currentItems,
      {
        id: itemId,
        isCustom: true,
        customName: normalizedName,
        quantity,
        unitPrice: normalizedPrice
      }
    ]);
  }

  changeQuantity(itemId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(itemId);
      return;
    }

    const updatedItems = this.itemsSubject.getValue().map((item) =>
      item.id === itemId ? { ...item, quantity } : item
    );

    this.itemsSubject.next(updatedItems);
  }

  removeItem(itemId: string): void {
    this.itemsSubject.next(this.itemsSubject.getValue().filter((item) => item.id !== itemId));
  }

  clearCart(): void {
    this.itemsSubject.next([]);
  }

  clearDraft(): void {
    this.clearCart();
    this.clearDiscount();
    this.clearDeliveryDetails();
  }

  setDiscount(discount: CartDiscount | null): void {
    const subtotal = this.getSubtotal();
    if (!discount || subtotal <= 0) {
      this.discountSubject.next(null);
      return;
    }

    const normalizedValue = Number(discount.value);
    if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
      this.discountSubject.next(null);
      return;
    }

    const boundedValue = discount.type === 'PERCENT'
      ? Math.min(normalizedValue, 100)
      : Math.min(normalizedValue, subtotal);

    this.discountSubject.next({
      type: discount.type,
      value: Number(boundedValue.toFixed(2))
    });
  }

  clearDiscount(): void {
    this.discountSubject.next(null);
  }

  setDeliveryDetails(details: DeliveryDetails | null): void {
    const sanitized = this.sanitizeDeliveryDetails(details);
    this.deliveryDetailsSubject.next(sanitized);
  }

  clearDeliveryDetails(): void {
    this.deliveryDetailsSubject.next(null);
  }

  hasMeaningfulDeliveryDetails(details: DeliveryDetails | null): boolean {
    if (!details) {
      return false;
    }

    return [
      details.customerName,
      details.customerPhone,
      details.deliveryAddress,
      details.deliveryNotes
    ].some((value) => Boolean(value?.trim()));
  }

  getSnapshot(): CartSnapshot {
    return {
      items: this.itemsSubject.getValue(),
      discount: this.discountSubject.getValue(),
      deliveryDetails: this.deliveryDetailsSubject.getValue(),
      taxPercentage: this.taxPercentageSubject.getValue()
    };
  }

  getSubtotal(): number {
    return this.itemsSubject
      .getValue()
      .reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  }

  private buildCustomItemId(customName: string, unitPrice: number): string {
    return `custom:${customName.trim().toLowerCase()}:${unitPrice.toFixed(2)}`;
  }

  private calculateDiscountAmount(subtotal: number, discount: CartDiscount | null): number {
    if (!discount || subtotal <= 0) {
      return 0;
    }

    if (discount.type === 'PERCENT') {
      return Number(Math.min(subtotal, subtotal * (discount.value / 100)).toFixed(2));
    }

    return Number(Math.min(subtotal, discount.value).toFixed(2));
  }

  private sanitizeDeliveryDetails(details: DeliveryDetails | null): DeliveryDetails | null {
    if (!details) {
      return null;
    }

    const sanitized: DeliveryDetails = {
      channel: details.channel,
      deliveryType: details.deliveryType,
      customerName: details.customerName?.trim() || undefined,
      customerPhone: details.customerPhone?.trim() || undefined,
      deliveryAddress: details.deliveryAddress?.trim() || undefined,
      deliveryNotes: details.deliveryNotes?.trim() || undefined
    };

    return this.hasMeaningfulDeliveryDetails(sanitized) ? sanitized : null;
  }
}