/**
 * Format a number as Brazilian Real currency.
 * @param {number} value
 * @returns {string} e.g. "R$ 1.234,56"
 */
export function formatCurrency(value) {
  if (value == null || isNaN(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
