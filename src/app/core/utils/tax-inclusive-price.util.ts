const roundedTaxIncludedPriceFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

export function roundTaxIncludedAmount(value: number): number {
  return Math.round(value);
}

export function formatRoundedTaxIncludedAmount(value: number): string {
  if (Number.isNaN(value)) {
    return '$ 0';
  }

  const sign = value < 0 ? '-' : '';
  const formattedAmount = roundedTaxIncludedPriceFormatter.format(Math.abs(roundTaxIncludedAmount(value)));

  return `${sign}$ ${formattedAmount}`;
}