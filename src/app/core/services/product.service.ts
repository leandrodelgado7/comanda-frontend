import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { Product, ProductSaleUnit } from '../models/product.model';
import { environment } from '../../../environments/environment';

interface ApiProductCategory {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
}

interface ApiProductImage {
  id: number;
  productId: number;
  url: string;
  isMain: boolean;
  displayOrder: number;
}

interface ApiProduct {
  id: number;
  name: string;
  description: string | null;
  internalCode: number | string | null;
  externalCode: string | null;
  price: number;
  promotionalPrice: number | null;
  category: ApiProductCategory | null;
  saleUnit: string;
  controlStock: boolean;
  stockCurrent: number;
  stockMin: number;
  available: boolean;
  images: ApiProductImage[];
  ranking: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly productsEndpoint = environment.productsApiUrl;
  private readonly categoriesEndpoint = environment.categoriesApiUrl;
  private cachedProducts$: Observable<Product[]> | null = null;

  constructor(private readonly http: HttpClient) {}

  public getProducts$(): Observable<Product[]> {
    if (!this.cachedProducts$) {
      this.cachedProducts$ = this.http
        .get<ApiProduct[]>(this.productsEndpoint)
        .pipe(
          map((products) => products.map((product) => this.mapApiProduct(product))),
          tap({
            error: () => {
              this.cachedProducts$ = null;
            }
          }),
          catchError((error) => {
            console.error('No se pudieron cargar los productos.', error);
            return of([] as Product[]);
          }),
          shareReplay(1)
        );
    }
    return this.cachedProducts$;
  }

  searchProducts(searchTerm: string, categories: string[] = []): Observable<Product[]> {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    const normalizedCategories = categories.map((category) => category.trim().toLowerCase());

    return this.getProducts$().pipe(
      map((products) => {
        return products.filter((product) => {
          const matchesSearch =
            !normalizedTerm ||
            product.codigo.toLowerCase().includes(normalizedTerm) ||
            product.descripcion.toLowerCase().includes(normalizedTerm) ||
            product.aliases.some((alias) => alias.toLowerCase().includes(normalizedTerm));

          const matchesCategory =
            normalizedCategories.length === 0 ||
            normalizedCategories.includes((product.categoria ?? '').trim().toLowerCase());

          return matchesSearch && matchesCategory;
        });
      })
    );
  }

  getCategories(): Observable<string[]> {
    return this.http.get<ApiProductCategory[]>(this.categoriesEndpoint).pipe(
      map((categories) =>
        categories
          .filter((category) => category.active)
          .map((category) => category.name.trim())
          .filter((category) => Boolean(category))
          .sort((a, b) => a.localeCompare(b, 'es'))
      ),
      catchError((error) => {
        console.error('No se pudieron cargar las categorías.', error);
        return of([] as string[]);
      })
    );
  }

  findByCodigo(codigo: string): Observable<Product | undefined> {
    const scannedExternalCode = codigo.trim();
    const scannedInternalCode = this.normalizeInternalCode(codigo);

    return this.getProducts$().pipe(
      map((products) => {
        return products.find((product) => {
          const productExternalCode = product.externalCode?.trim() ?? '';
          const productInternalCode = this.normalizeInternalCode(product.internalCode ?? '');

          return (
            productExternalCode === scannedExternalCode ||
            (productInternalCode !== '' && productInternalCode === scannedInternalCode) ||
            String(product.codigo).trim() === scannedExternalCode
          );
        });
      })
    );
  }

  invalidateCache(): void {
    this.cachedProducts$ = null;
  }

  private mapApiProduct(product: ApiProduct): Product {
    const mainImage = [...product.images]
      .sort((left, right) => {
        if (left.isMain !== right.isMain) {
          return left.isMain ? -1 : 1;
        }

        return left.displayOrder - right.displayOrder;
      })[0];
    const externalCode = product.externalCode?.trim() ?? '';
    const internalCode = String(product.internalCode ?? '').trim();
    const code = externalCode || internalCode || String(product.id);

    return {
      id: String(product.id),
      codigo: code,
      externalCode: externalCode || undefined,
      internalCode: internalCode || undefined,
      descripcion: product.name.trim(),
      aliases: product.description?.trim() ? [product.description.trim()] : [],
      precio: product.price,
      promotionalPrice: product.promotionalPrice,
      imagen: mainImage?.url?.trim() ?? '',
      disponible: product.available,
      saleUnit: this.mapSaleUnit(product.saleUnit),
      categoria: product.category?.name?.trim(),
      ranking: product.ranking ?? 0
    };
  }

  private normalizeInternalCode(code: string): string {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      return '';
    }

    const withoutLeadingZeros = trimmedCode.replace(/^0+/, '');
    return withoutLeadingZeros || '0';
  }

  private mapSaleUnit(saleUnit: string | null | undefined): ProductSaleUnit {
    return saleUnit === 'FRACTION' ? 'FRACTION' : 'UNIT';
  }
}
