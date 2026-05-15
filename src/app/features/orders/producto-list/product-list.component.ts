import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, map } from 'rxjs';
import { Product } from '../../../core/models/product.model';
import { ProductService } from '../../../core/services/product.service';
import { OrderService } from '../../../core/services/order.service';

type ProductLayoutMode = 'grid' | 'list';
type ProductSortMode = 'ranking' | 'name-asc' | 'name-desc' | 'category-asc' | 'category-desc';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss'
})
export class ProductListComponent implements OnChanges {
  @Input() searchTerm = '';
  @Input() selectedCategories: string[] = [];
  @Input() layoutMode: ProductLayoutMode = 'grid';
  @Input() sortMode: ProductSortMode = 'ranking';

  products$: Observable<Product[]> = this.productService.searchProducts('').pipe(
    map((products) => this.sortProducts(products, this.sortMode))
  );
  readonly quantityByProductId$ = this.orderService.items$.pipe(
    map((items) =>
      items.reduce(
        (acc, item) => ({
          ...acc,
          [String(item.product.id)]: (acc[String(item.product.id)] ?? 0) + (item.product.saleUnit === 'FRACTION' ? 1 : item.quantity)
        }),
        {} as Record<string, number>
      )
    )
  );
  private readonly imageLoadErrors: Record<string, boolean> = {};
  private readonly priceFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  constructor(
    private readonly productService: ProductService,
    private readonly orderService: OrderService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchTerm'] || changes['selectedCategories'] || changes['sortMode']) {
      this.products$ = this.productService.searchProducts(this.searchTerm, this.selectedCategories).pipe(
        map((products) => this.sortProducts(products, this.sortMode))
      );
    }
  }

  addToOrder(product: Product): void {
    this.orderService.addProduct(product);
  }

  hasProductImage(product: Product): boolean {
    const key = this.getProductKey(product);
    return Boolean(product.imagen?.trim()) && !this.imageLoadErrors[key];
  }

  onProductImageError(product: Product): void {
    this.imageLoadErrors[this.getProductKey(product)] = true;
  }

  getSelectedQuantity(product: Product, quantityByProductId: Record<string, number>): number {
    return quantityByProductId[this.getProductKey(product)] ?? 0;
  }

  getDisplayPrice(product: Product): string {
    const formattedPrice = this.priceFormatter.format(product.precio);

    return product.saleUnit === 'FRACTION'
      ? `${formattedPrice} / kg`
      : formattedPrice;
  }

  getPromotionalDisplayPrice(product: Product): string {
    const promotionalPrice = this.getEffectiveUnitPrice(product);
    const formattedPrice = this.priceFormatter.format(promotionalPrice);

    return product.saleUnit === 'FRACTION'
      ? `${formattedPrice} / kg`
      : formattedPrice;
  }

  hasPromotionalPrice(product: Product): boolean {
    const promotionalPrice = product.promotionalPrice;
    return promotionalPrice !== null && promotionalPrice !== undefined && promotionalPrice > 0;
  }

  private getEffectiveUnitPrice(product: Product): number {
    const promotionalPrice = product.promotionalPrice;
    return promotionalPrice !== null && promotionalPrice !== undefined && promotionalPrice > 0
      ? promotionalPrice
      : product.precio;
  }

  private getProductKey(product: Product): string {
    return String(product.id);
  }

  private sortProducts(products: Product[], mode: ProductSortMode): Product[] {
    const safeText = (value: string | undefined): string => (value ?? '').trim().toLowerCase();
    const byDescription = (a: Product, b: Product): number => safeText(a.descripcion).localeCompare(safeText(b.descripcion), 'es');

    const sorted = [...products];

    switch (mode) {
      case 'name-asc':
        return sorted.sort((a, b) => byDescription(a, b));
      case 'name-desc':
        return sorted.sort((a, b) => byDescription(b, a));
      case 'category-asc':
        return sorted.sort((a, b) => {
          const categoryCompare = safeText(a.categoria).localeCompare(safeText(b.categoria), 'es');
          return categoryCompare !== 0 ? categoryCompare : byDescription(a, b);
        });
      case 'category-desc':
        return sorted.sort((a, b) => {
          const categoryCompare = safeText(b.categoria).localeCompare(safeText(a.categoria), 'es');
          return categoryCompare !== 0 ? categoryCompare : byDescription(a, b);
        });
      case 'ranking':
      default:
        return sorted.sort((a, b) => {
          const rankingCompare = (b.ranking ?? 0) - (a.ranking ?? 0);
          return rankingCompare !== 0 ? rankingCompare : byDescription(a, b);
        });
    }
  }
}
