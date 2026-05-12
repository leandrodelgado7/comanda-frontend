import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
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
  internalCode: number | null;
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
  private readonly products$ = this.http
    .get<ApiProduct[]>(this.productsEndpoint)
    .pipe(
      map((products) => products.map((product) => this.mapApiProduct(product))),
      catchError((error) => {
        console.error('No se pudieron cargar los productos.', error);
        return of([] as Product[]);
      }),
      shareReplay(1)
    );

  constructor(private readonly http: HttpClient) {}

  searchProducts(searchTerm: string, categories: string[] = []): Observable<Product[]> {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    const normalizedCategories = categories.map((category) => category.trim().toLowerCase());

    return this.products$.pipe(
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
    const normalizedCode = codigo.trim();

    return this.products$.pipe(
      map((products) =>
        products.find((product) => String(product.codigo).trim() === normalizedCode)
      )
    );
  }

  private mapApiProduct(product: ApiProduct): Product {
    const mainImage = [...product.images]
      .sort((left, right) => {
        if (left.isMain !== right.isMain) {
          return left.isMain ? -1 : 1;
        }

        return left.displayOrder - right.displayOrder;
      })[0];
    const code = product.externalCode?.trim() || String(product.internalCode ?? product.id);

    return {
      id: String(product.id),
      codigo: code,
      descripcion: product.name.trim(),
      aliases: product.description?.trim() ? [product.description.trim()] : [],
      precio: product.promotionalPrice ?? product.price,
      imagen: mainImage?.url?.trim() ?? '',
      disponible: product.available,
      saleUnit: this.mapSaleUnit(product.saleUnit),
      categoria: product.category?.name?.trim(),
      ranking: product.ranking ?? 0
    };
  }

  private mapSaleUnit(saleUnit: string | null | undefined): ProductSaleUnit {
    return saleUnit === 'FRACTION' ? 'FRACTION' : 'UNIT';
  }
}
