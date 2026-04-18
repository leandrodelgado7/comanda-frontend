import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-unregistered-item-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './unregistered-item-modal.component.html',
  styleUrl: './unregistered-item-modal.component.scss'
})
export class UnregisteredItemModalComponent {
  @Input() isOpen = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() addItem = new EventEmitter<number>();
  amountInput: string | number = '';

  get canAdd(): boolean {
    const amount = this.parseAmount();
    return Number.isFinite(amount) && amount > 0;
  }

  onClose(): void {
    this.amountInput = '';
    this.closeModal.emit();
  }

  onAdd(): void {
    const amount = this.parseAmount();

    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    this.amountInput = '';
    this.addItem.emit(amount);
  }

  private parseAmount(): number {
    if (typeof this.amountInput === 'number') {
      return this.amountInput;
    }

    return Number(this.amountInput.replace(',', '.'));
  }
}
