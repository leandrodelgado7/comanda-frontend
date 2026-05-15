import { HttpClient } from '@angular/common/http';
import { OrderService } from './order.service';
import { Product } from '../models/product.model';

describe('OrderService', () => {
  let service: OrderService;

  const httpClientStub = jasmine.createSpyObj<HttpClient>('HttpClient', ['post']);

  const unitProduct: Product = {
    id: '1',
    codigo: 'A1',
    descripcion: 'Producto unitario',
    aliases: [],
    precio: 100,
    imagen: '',
    disponible: true,
    saleUnit: 'UNIT'
  };

  const fractionProduct: Product = {
    id: '2',
    codigo: 'B2',
    descripcion: 'Producto fraccionado',
    aliases: [],
    precio: 1000,
    imagen: '',
    disponible: true,
    saleUnit: 'FRACTION'
  };

  beforeEach(() => {
    service = new OrderService(httpClientStub);
  });

  it('agrupa productos UNIT incrementando la cantidad', () => {
    service.addProduct(unitProduct);
    service.addProduct(unitProduct);

    const items = service.getCurrentItems();

    expect(items.length).toBe(1);
    expect(items[0].quantity).toBe(2);
    expect(service.getCurrentTotal()).toBe(200);
  });

  it('agrega productos FRACTION como lineas independientes y calcula total por gramos', () => {
    service.addProduct(fractionProduct);
    service.addProduct(fractionProduct);

    const [firstItem, secondItem] = service.getCurrentItems();

    expect(service.getCurrentItems().length).toBe(2);
    expect(firstItem.quantity).toBe(0);
    expect(secondItem.quantity).toBe(0);

    service.updateFractionWeight(firstItem.id, 200);
    service.updateFractionWeight(secondItem.id, 350);

    const items = service.getCurrentItems();

    expect(items[0].weightGrams).toBe(200);
    expect(items[0].quantity).toBe(0.2);
    expect(items[1].weightGrams).toBe(350);
    expect(items[1].quantity).toBe(0.35);
    expect(service.getCurrentTotal()).toBe(550);
  });

  it('agrega un producto FRACTION por gramos en una sola linea', () => {
    service.addFractionProductByWeight(fractionProduct, 350);

    const items = service.getCurrentItems();

    expect(items.length).toBe(1);
    expect(items[0].weightGrams).toBe(350);
    expect(items[0].quantity).toBe(0.35);
    expect(service.getCurrentTotal()).toBe(350);
  });
});