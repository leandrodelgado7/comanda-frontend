import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  constructor(private readonly messageService: MessageService) {}

  showSuccessToast(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Exito',
      detail: message
    });
  }

  showErrorToast(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message
    });
  }
}
