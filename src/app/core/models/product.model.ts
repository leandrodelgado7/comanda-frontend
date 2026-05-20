export type ProductSaleUnit = 'UNIT' | 'FRACTION';

export interface Product {
  id: string;
  codigo: string;
  externalCode?: string;
  internalCode?: string;
  descripcion: string;
  aliases: string[];
  precio: number;
  promotionalPrice?: number | null;
  imagen: string;
  disponible: boolean;
  saleUnit: ProductSaleUnit;
  categoria?: string;
  ranking?: number;
}
