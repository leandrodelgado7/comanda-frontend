import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, finalize, take } from 'rxjs';
import { CartDiscount, CartItem, DeliveryDetails, DiscountType, OrderChannel, DeliveryType } from '../../../core/models/cart-item.model';
import { CreateOrderItem, CreateOrderRequest } from '../../../core/models/create-order-request.model';
import { CarritoService } from '../../../core/services/carrito.service';
import { PedidoService } from '../../../core/services/pedido.service';

@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-summary.component.html',
  styleUrl: './order-summary.component.scss'
})
export class OrderSummaryComponent {
  private readonly fallbackUserId = 1;
  private readonly submittingSubject = new BehaviorSubject<boolean>(false);

  readonly items$ = this.carritoService.items$;
  readonly subtotal$ = this.carritoService.subtotal$;
  readonly taxAmount$ = this.carritoService.taxAmount$;
  readonly total$ = this.carritoService.total$;
  readonly discount$ = this.carritoService.discount$;
  readonly discountAmount$ = this.carritoService.discountAmount$;
  readonly deliveryDetails$ = this.carritoService.deliveryDetails$;
  readonly submitting$ = this.submittingSubject.asObservable();

  readonly channelOptions: Array<{ value: OrderChannel; label: string }> = [
    { value: 'PHONE', label: 'Teléfono' },
    { value: 'WEB', label: 'Web' },
    { value: 'OTHER', label: 'Otro' },
    { value: 'IN_STORE', label: 'Mostrador' }
  ];
  readonly deliveryTypeOptions: Array<{ value: DeliveryType; label: string }> = [
    { value: 'DELIVERY', label: 'Envío' },
    { value: 'PICKUP', label: 'Retiro' }
  ];

  isDiscountModalOpen = false;
  isDeliveryModalOpen = false;
  discountType: DiscountType = 'PERCENT';
  discountValueInput: string | number = '';
  deliveryForm: DeliveryDetails = {
    channel: 'PHONE',
    deliveryType: 'DELIVERY',
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    deliveryNotes: ''
  };
  submitMessage = '';
  submitMessageType: 'success' | 'error' | '' = '';

  constructor(
    private readonly carritoService: CarritoService,
    private readonly pedidoService: PedidoService
  ) {}

  increaseQuantity(itemId: string, currentQuantity: number): void {
    this.carritoService.changeQuantity(itemId, currentQuantity + 1);
  }

  decreaseQuantity(itemId: string, currentQuantity: number): void {
    this.carritoService.changeQuantity(itemId, currentQuantity - 1);
  }

  removeItem(itemId: string): void {
    this.carritoService.removeItem(itemId);
  }

  clearOrder(): void {
    this.submitMessage = '';
    this.submitMessageType = '';
    this.carritoService.clearDraft();
  }

  getItemLabel(item: CartItem): string {
    return item.isCustom ? item.customName : item.product.descripcion;
  }

  openDiscountModal(): void {
    const snapshot = this.carritoService.getSnapshot().discount;
    this.discountType = snapshot?.type ?? 'PERCENT';
    this.discountValueInput = snapshot?.value ?? '';
    this.isDiscountModalOpen = true;
  }

  closeDiscountModal(): void {
    this.isDiscountModalOpen = false;
    this.discountValueInput = '';
  }

  applyDiscount(): void {
    const parsedValue = Number(String(this.discountValueInput).replace(',', '.'));
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      this.carritoService.clearDiscount();
      this.closeDiscountModal();
      return;
    }

    this.carritoService.setDiscount({
      type: this.discountType,
      value: parsedValue
    });
    this.closeDiscountModal();
  }

  removeDiscount(): void {
    this.carritoService.clearDiscount();
  }

  openDeliveryModal(): void {
    const details = this.carritoService.getSnapshot().deliveryDetails;
    this.deliveryForm = {
      channel: details?.channel ?? 'PHONE',
      deliveryType: details?.deliveryType ?? 'DELIVERY',
      customerName: details?.customerName ?? '',
      customerPhone: details?.customerPhone ?? '',
      deliveryAddress: details?.deliveryAddress ?? '',
      deliveryNotes: details?.deliveryNotes ?? ''
    };
    this.isDeliveryModalOpen = true;
  }

  closeDeliveryModal(): void {
    this.isDeliveryModalOpen = false;
  }

  saveDeliveryDetails(): void {
    this.carritoService.setDeliveryDetails(this.deliveryForm);
    this.closeDeliveryModal();
  }

  clearDeliveryDetails(): void {
    this.carritoService.clearDeliveryDetails();
    this.deliveryForm = {
      channel: 'PHONE',
      deliveryType: 'DELIVERY',
      customerName: '',
      customerPhone: '',
      deliveryAddress: '',
      deliveryNotes: ''
    };
    this.closeDeliveryModal();
  }

  storeOrder(): void {
    if (this.submittingSubject.getValue()) {
      return;
    }

    const snapshot = this.carritoService.getSnapshot();
    if (snapshot.items.length === 0) {
      return;
    }

    const request = this.buildCreateOrderRequest(snapshot.items, snapshot.discount, snapshot.deliveryDetails, snapshot.taxPercentage);
    this.submitMessage = '';
    this.submitMessageType = '';
    this.submittingSubject.next(true);

    this.pedidoService.crearPedido(request).pipe(
      take(1),
      finalize(() => this.submittingSubject.next(false))
    ).subscribe({
      next: () => {
        this.carritoService.clearDraft();
        this.isDiscountModalOpen = false;
        this.isDeliveryModalOpen = false;
        this.submitMessage = 'Pedido almacenado correctamente.';
        this.submitMessageType = 'success';
      },
      error: () => {
        this.submitMessage = 'No se pudo almacenar el pedido. Conservamos el estado para reintentar.';
        this.submitMessageType = 'error';
      }
    });
  }

  private buildCreateOrderRequest(
    items: CartItem[],
    discount: CartDiscount | null,
    deliveryDetails: DeliveryDetails | null,
    taxPercentage: number
  ): CreateOrderRequest {
    const hasDelivery = this.carritoService.hasMeaningfulDeliveryDetails(deliveryDetails);
    const request: CreateOrderRequest = {
      userId: this.fallbackUserId,
      channel: hasDelivery ? deliveryDetails?.channel ?? 'PHONE' : 'IN_STORE',
      deliveryType: hasDelivery ? deliveryDetails?.deliveryType ?? 'DELIVERY' : 'PICKUP',
      taxPercentage,
      items: items.map((item) => this.mapItemToRequest(item))
    };

    if (discount) {
      request.discountType = discount.type;
      request.discountValue = discount.value;
    }

    if (hasDelivery) {
      if (deliveryDetails?.customerName) {
        request.customerName = deliveryDetails.customerName;
      }
      if (deliveryDetails?.customerPhone) {
        request.customerPhone = deliveryDetails.customerPhone;
      }
      if (deliveryDetails?.deliveryAddress) {
        request.deliveryAddress = deliveryDetails.deliveryAddress;
      }
      if (deliveryDetails?.deliveryNotes) {
        request.deliveryNotes = deliveryDetails.deliveryNotes;
      }
    }

    return request;
  }

  private mapItemToRequest(item: CartItem): CreateOrderItem {
    if (item.isCustom) {
      return {
        isCustom: true,
        customName: item.customName,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      };
    }

    return {
      isCustom: false,
      productId: String(item.product.id),
      quantity: item.quantity
    };
  }
}
