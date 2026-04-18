export interface Product {
  id: string;
  codigo: string;
  descripcion: string;
  aliases: string[];
  precio: number;
  imagen: string;
  disponible: boolean;
  categoria?: string;
  ranking?: number;
}
