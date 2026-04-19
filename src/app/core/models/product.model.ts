export type ProductSaleUnit = 'UNIT' | 'FRACTION';

export interface Product {
  id: string;
  codigo: string;
  descripcion: string;
  aliases: string[];
  precio: number;
  imagen: string;
  disponible: boolean;
  saleUnit: ProductSaleUnit;
  categoria?: string;
  ranking?: number;
}
