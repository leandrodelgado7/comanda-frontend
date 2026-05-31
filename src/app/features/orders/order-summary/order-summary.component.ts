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
import { environment } from '../../../../environments/environment';
import { AuthStorageService } from '../../../core/services/auth-storage.service';
import { ToastService } from '../../../core/services/toast.service';

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
  readonly taxPercentage = environment.taxPercentage;
  private readonly taxRate = this.taxPercentage / 100;
  readonly iva$ = this.subtotal$.pipe(map((subtotal) => subtotal * this.taxRate));
  readonly total$ = this.subtotal$.pipe(map((subtotal) => subtotal * (1 + this.taxRate)));
  isSubmitting = false;

  constructor(
    private readonly pedidoService: OrderService,
    private readonly authStorage: AuthStorageService,
    private readonly toastService: ToastService
  ) {}

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
  }

  submitOrder(): void {
    const items = this.pedidoService.getCurrentItems();

    if (this.isSubmitting) {
      return;
    }

    if (items.length === 0) {
      this.toastService.showErrorToast('Debes agregar al menos un producto para enviar el pedido.');
      return;
    }

    if (items.some((item) => item.quantity <= 0)) {
      this.toastService.showErrorToast('No puede haber productos con cantidad en cero.');
      return;
    }

    const request = this.buildCreateOrderRequest(items);
    this.isSubmitting = true;

    this.pedidoService
      .crearPedido(request)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: () => {
          this.toastService.showSuccessToast('Pedido enviado correctamente.');
          this.pedidoService.clearOrder();
          this.pedidoService.reloadProducts(); // Reinvoke the product service to reload products
        },
        error: () => {
          this.toastService.showErrorToast('No se pudo enviar el pedido. Intenta nuevamente.');
        }
      });
  }

  private buildCreateOrderRequest(items: OrderItem[]): CreateOrderRequest {
    const userId = this.authStorage.getSession()?.user.id ?? 1;
    return {
      userId,
      createdBy: userId,
      channel: 'IN_STORE',
      deliveryType: 'PICKUP',
      taxPercentage: this.taxPercentage,
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
    return this.getEffectiveUnitPrice(item) * item.quantity;
  }

  getItemOriginalTotal(item: OrderItem): number {
    return item.product.precio * item.quantity;
  }

  hasPromotionalPrice(item: OrderItem): boolean {
    const promotionalPrice = item.product.promotionalPrice;
    return promotionalPrice !== null && promotionalPrice !== undefined && promotionalPrice > 0;
  }

  private getEffectiveUnitPrice(item: OrderItem): number {
    const promotionalPrice = item.product.promotionalPrice;
    return promotionalPrice !== null && promotionalPrice !== undefined && promotionalPrice > 0
      ? promotionalPrice
      : item.product.precio;
  }

  private isCustomItem(item: OrderItem): boolean {
    return item.product.id.startsWith('unregistered-item-');
  }
}
