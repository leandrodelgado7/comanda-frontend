import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

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
  netAmountInput: string | number = '';
  totalAmountInput: string | number = '';

  private readonly taxMultiplier = 1 + environment.taxPercentage / 100;

  get canAdd(): boolean {
    const amount = this.parseAmount(this.netAmountInput);
    return Number.isFinite(amount) && amount > 0;
  }

  onClose(): void {
    this.resetInputs();
    this.closeModal.emit();
  }

  onAdd(): void {
    const amount = this.parseAmount(this.netAmountInput);

    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    this.resetInputs();
    this.addItem.emit(amount);
  }

  onNetAmountChange(value: string | number): void {
    this.netAmountInput = value;

    const netAmount = this.parseAmount(value);

    if (!Number.isFinite(netAmount) || netAmount <= 0) {
      this.totalAmountInput = '';
      return;
    }

    this.totalAmountInput = this.roundAmount(netAmount * this.taxMultiplier);
  }

  onTotalAmountChange(value: string | number): void {
    this.totalAmountInput = value;

    const totalAmount = this.parseAmount(value);

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      this.netAmountInput = '';
      return;
    }

    this.netAmountInput = this.roundAmount(totalAmount / this.taxMultiplier);
  }

  private resetInputs(): void {
    this.netAmountInput = '';
    this.totalAmountInput = '';
  }

  private parseAmount(value: string | number): number {
    if (typeof value === 'number') {
      return value;
    }

    return Number(value.replace(',', '.'));
  }

  private roundAmount(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
