/**
 * Formatadores numéricos - usando Intl para pt-BR
 */

/** Locale padrão */
const LOCALE = 'pt-BR';

/**
 * Formata valor como moeda
 * @param value - Valor numérico
 * @param currency - Código da moeda (BRL, USD, EUR)
 * @returns String formatada (ex: "R$ 1.234,56")
 */
export function formatCurrency(
  value: number,
  currency: string = 'BRL'
): string {
  if (!Number.isFinite(value)) return '—';

  const upper = currency.toUpperCase();

  try {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: upper,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}

/**
 * Formata número com separador decimal pt-BR
 * @param value - Valor numérico
 * @param maxDecimals - Máximo de casas decimais
 */
export function formatNumber(
  value: number,
  maxDecimals: number = 2
): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}
