import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'moneyFormat',
  standalone: true
})
export class MoneyFormatPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '$ 0,00';
    }

    const sign = value < 0 ? '-' : '';
    const formattedAmount = this.formatter.format(Math.abs(value));

    return `${sign}$ ${formattedAmount}`;
  }
}