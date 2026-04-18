import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, map } from 'rxjs';
import { Product } from '../../../core/models/product.model';
import { ProductService } from '../../../core/services/product.service';
import { CarritoService } from '../../../core/services/carrito.service';

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

  products$: Observable<Product[]> = this.productService.searchProducts('');
  readonly quantityByProductId$ = this.carritoService.items$.pipe(
    map((items) =>
      items.reduce(
        (acc, item) => (!item.isCustom ? { ...acc, [String(item.product.id)]: item.quantity } : acc),
        {} as Record<string, number>
      )
    )
  );
  private readonly imageLoadErrors: Record<string, boolean> = {};

  constructor(
    private readonly productService: ProductService,
    private readonly carritoService: CarritoService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchTerm'] || changes['selectedCategories'] || changes['sortMode']) {
      this.products$ = this.productService.searchProducts(this.searchTerm, this.selectedCategories).pipe(
        map((products) => this.sortProducts(products, this.sortMode))
      );
    }
  }

  addToOrder(product: Product): void {
    this.carritoService.addProduct(product);
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
