import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { map } from 'rxjs';
import { ProductListComponent } from './producto-list/product-list.component';
import { OrderSummaryComponent } from './order-summary/order-summary.component';
import { TopBarComponent } from './top-bar/top-bar.component';
import { VoiceOrderPanelComponent } from './voice-order/voice-order-panel.component';
import { BarcodeScannerPanelComponent } from './barcode-order/barcode-scanner-panel.component';
import { Product } from '../../core/models/product.model';
import { User } from '../../core/models/auth.model';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { UnregisteredItemModalComponent } from './unregistered-item-modal/unregistered-item-modal.component';
import { MoneyFormatPipe } from '../../core/pipes/money-format.pipe';

type ProductLayoutMode = 'grid' | 'list';
type ProductSortMode = 'ranking' | 'name-asc' | 'name-desc' | 'category-asc' | 'category-desc';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, TopBarComponent, ProductListComponent, OrderSummaryComponent, UnregisteredItemModalComponent, MoneyFormatPipe],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit {
  readonly voiceOrderPanelComponent = VoiceOrderPanelComponent;
  readonly barcodeScannerPanelComponent = BarcodeScannerPanelComponent;
  readonly itemsCount$ = this.orderService.items$.pipe(
    map((items) => items.reduce((acc, item) => acc + (item.product.saleUnit === 'FRACTION' ? 1 : item.quantity), 0))
  );
  readonly orderTotal$ = this.orderService.total$;
  readonly user$ = this.authService.currentUser$;
  searchTerm = '';
  selectedCategories: string[] = [];
  layoutMode: ProductLayoutMode = 'grid';
  sortMode: ProductSortMode = 'ranking';
  isUserMenuOpen = false;
  isSummarySheetOpen = false;
  isMobilePortrait = false;
  isVoiceOrderActive = false;
  isBarcodeScannerActive = false;
  isFullscreen = false;
  isUnregisteredItemModalOpen = false;
  private unregisteredItemCount = 0;

  constructor(
    private readonly authService: AuthService,
    private readonly orderService: OrderService,
    private readonly elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.updateViewportMode();
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
  }

  onCategoriesChange(categories: string[]): void {
    this.selectedCategories = categories;
  }

  onSortModeChange(mode: ProductSortMode): void {
    this.sortMode = mode;
  }

  onLayoutButtonPress(): void {
    this.layoutMode = this.layoutMode === 'grid' ? 'list' : 'grid';
  }

  selectManualMode(): void {
    if (!this.isVoiceOrderActive && !this.isBarcodeScannerActive) {
      return;
    }

    this.activateManualMode();
  }

  selectVoiceOrderView(): void {
    if (this.isVoiceOrderActive) {
      return;
    }

    this.isVoiceOrderActive = true;
    this.isBarcodeScannerActive = false;
  }

  selectBarcodeScannerView(): void {
    if (this.isBarcodeScannerActive) {
      return;
    }

    this.isBarcodeScannerActive = true;
    this.isVoiceOrderActive = false;
  }

  openUnregisteredItemModal(): void {
    this.isUnregisteredItemModalOpen = true;
  }

  closeUnregisteredItemModal(): void {
    this.isUnregisteredItemModalOpen = false;
    this.activateManualMode();
  }

  addUnregisteredItem(amount: number): void {
    this.unregisteredItemCount += 1;

    const product: Product = {
      id: `unregistered-item-${this.unregisteredItemCount}`,
      codigo: '',
      descripcion: `Item no registrado ${this.unregisteredItemCount}`,
      aliases: [],
      precio: amount,
      imagen: '',
      disponible: true,
      saleUnit: 'UNIT'
    };

    this.orderService.addProduct(product);
    this.closeUnregisteredItemModal();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isUserMenuOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.closeUserMenu();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateViewportMode();
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen = Boolean(document.fullscreenElement);
  }

  toggleSummarySheet(): void {
    if (!this.isMobilePortrait) {
      return;
    }

    this.isSummarySheetOpen = !this.isSummarySheetOpen;
  }

  closeSummarySheet(): void {
    this.isSummarySheetOpen = false;
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  logout(): void {
    this.closeUserMenu();
    this.authService.logout().subscribe();
  }

  getUserDisplayName(user: User | null): string {
    if (!user) {
      return 'Usuario';
    }

    const fullName = `${user.firstName} ${user.lastName}`.trim();
    return fullName || user.username;
  }

  getUserInitials(user: User | null): string {
    const displayName = this.getUserDisplayName(user);
    const initials = displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');

    return initials || 'U';
  }

  private updateViewportMode(): void {
    const isPortraitMobile = window.matchMedia('(max-width: 767.98px) and (orientation: portrait)').matches;
    this.isMobilePortrait = isPortraitMobile;

    if (!isPortraitMobile) {
      this.isSummarySheetOpen = false;
    }
  }

  async toggleFullscreen(): Promise<void> {
    if (this.isFullscreen) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen();
  }

  private activateManualMode(): void {
    this.isVoiceOrderActive = false;
    this.isBarcodeScannerActive = false;
  }
}
