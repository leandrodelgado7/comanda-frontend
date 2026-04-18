import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { OrderItem } from '../models/order-item.model';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly itemsSubject = new BehaviorSubject<OrderItem[]>([]);
  readonly items$ = this.itemsSubject.asObservable();
  readonly total$ = this.items$.pipe(
    map((items) => items.reduce((acc, item) => acc + item.product.precio * item.quantity, 0))
  );

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

    const currentItems = this.itemsSubject.getValue();
    const existingItem = currentItems.find((item) => item.product.id === product.id);

    if (existingItem) {
      this.changeQuantity(product.id, existingItem.quantity + quantity);
      return;
    }

    this.itemsSubject.next([...currentItems, { product, quantity }]);
  }

  changeQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeProduct(productId);
      return;
    }

    const updatedItems = this.itemsSubject.getValue().map((item) =>
      item.product.id === productId ? { ...item, quantity } : item
    );

    this.itemsSubject.next(updatedItems);
  }

  removeProduct(productId: string): void {
    const updatedItems = this.itemsSubject
      .getValue()
      .filter((item) => item.product.id !== productId);

    this.itemsSubject.next(updatedItems);
  }

  clearOrder(): void {
    this.itemsSubject.next([]);
  }

  getCurrentTotal(): number {
    return this.itemsSubject
      .getValue()
      .reduce((acc, item) => acc + item.product.precio * item.quantity, 0);
  }
}
