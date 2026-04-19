import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize, map } from 'rxjs';
import {
  CreateOrderItemRequest,
  CreateOrderRequest,
  OrderService
} from '../../../core/services/order.service';
import { OrderItem } from '../../../core/models/order-item.model';
import { MoneyFormatPipe } from '../../../core/pipes/money-format.pipe';

@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [CommonModule, MoneyFormatPipe],
  templateUrl: './order-summary.component.html',
  styleUrl: './order-summary.component.scss'
})
export class OrderSummaryComponent {
  readonly items$ = this.pedidoService.items$;
  readonly subtotal$ = this.pedidoService.total$;
  readonly iva$ = this.subtotal$.pipe(map((subtotal) => subtotal * 0.21));
  readonly total$ = this.subtotal$.pipe(map((subtotal) => subtotal * 1.21));
  isSubmitting = false;
  submitError = '';
  submitSuccess = '';

  constructor(private readonly pedidoService: OrderService) {}

  increaseQuantity(itemId: string, currentQuantity: number): void {
    this.pedidoService.changeQuantity(itemId, currentQuantity + 1);
  }

  decreaseQuantity(itemId: string, currentQuantity: number): void {
    this.pedidoService.changeQuantity(itemId, currentQuantity - 1);
  }

  removeItem(itemId: string): void {
    this.pedidoService.removeProduct(itemId);
  }

  updateFractionWeight(itemId: string, rawValue: string): void {
    const normalizedValue = rawValue.replace(',', '.').trim();
    const weightGrams = normalizedValue === '' ? 0 : Number(normalizedValue);

    this.pedidoService.updateFractionWeight(itemId, weightGrams);
  }

  clearOrder(): void {
    this.pedidoService.clearOrder();
    this.submitError = '';
    this.submitSuccess = '';
  }

  submitOrder(): void {
    const items = this.pedidoService.getCurrentItems();

    if (items.length === 0 || this.isSubmitting) {
      return;
    }

    const request = this.buildCreateOrderRequest(items);
    this.isSubmitting = true;
    this.submitError = '';
    this.submitSuccess = '';

    this.pedidoService
      .crearPedido(request)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: () => {
          this.submitSuccess = 'Pedido enviado correctamente.';
          this.pedidoService.clearOrder();
        },
        error: () => {
          this.submitError = 'No se pudo enviar el pedido. Intenta nuevamente.';
        }
      });
  }

  private buildCreateOrderRequest(items: OrderItem[]): CreateOrderRequest {
    return {
      userId: 1,
      channel: 'IN_STORE',
      deliveryType: 'PICKUP',
      taxPercentage: 21,
      discountType: null,
      discountValue: null,
      customerName: null,
      customerPhone: null,
      deliveryAddress: null,
      deliveryNotes: null,
      items: items.map((item) => this.mapOrderItem(item))
    };
  }

  private mapOrderItem(item: OrderItem): CreateOrderItemRequest {
    if (this.isCustomItem(item)) {
      return {
        isCustom: true,
        customName: item.product.descripcion,
        quantity: item.quantity,
        unitPrice: item.product.precio
      };
    }

    return {
      isCustom: false,
      productId: Number(item.product.id),
      quantity: item.quantity
    };
  }

  isFractionItem(item: OrderItem): boolean {
    return item.product.saleUnit === 'FRACTION';
  }

  getItemWeightGrams(item: OrderItem): number {
    return item.weightGrams ?? Math.round(item.quantity * 1000);
  }

  getItemWeightDisplayValue(item: OrderItem): string {
    const weightGrams = item.weightGrams;

    if (weightGrams === undefined || weightGrams === null) {
      return '';
    }

    return weightGrams === 0 ? '' : String(weightGrams);
  }

  getItemTotal(item: OrderItem): number {
    return item.product.precio * item.quantity;
  }

  private isCustomItem(item: OrderItem): boolean {
    return item.product.id.startsWith('unregistered-item-');
  }
}
