import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly products$ = this.http
    .get<Product[]>('assets/products.json')
    .pipe(shareReplay(1));

  constructor(private readonly http: HttpClient) {}

  searchProducts(searchTerm: string, categories: string[] = []): Observable<Product[]> {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    const normalizedCategories = categories.map((category) => category.trim().toLowerCase());

    return this.products$.pipe(
      map((products) => {
        return products.filter((product) => {
          const matchesSearch =
            !normalizedTerm ||
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

  findByCodigo(codigo: string): Observable<Product | undefined> {
    const normalizedCode = codigo.trim();

    return this.products$.pipe(
      map((products) =>
        products.find((product) => String(product.codigo).trim() === normalizedCode)
      )
    );
  }
}
