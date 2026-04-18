import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateOrderRequest, CreateOrderResponse } from '../models/create-order-request.model';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private readonly endpoint = '/api/orders';

  constructor(private readonly http: HttpClient) {}

  crearPedido(request: CreateOrderRequest): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(this.endpoint, request);
  }
}