/**
 * Conversão de moedas - 100% offline
 * Taxas de câmbio fixas (atualize conforme necessário)
 */

export const CURRENCY_ERROR = 'Erro';

/** Moedas suportadas */
export type SupportedCurrency = 'USD' | 'BRL' | 'EUR';

/** Taxas em relação a USD (1 USD = X) */
const EXCHANGE_RATES: Record<SupportedCurrency, number> = {
  USD: 1,
  BRL: 5.5,
  EUR: 0.92,
};

/**
 * Converte valor entre moedas
 * @param amount - Valor a converter
 * @param from - Moeda de origem (USD, BRL, EUR)
 * @param to - Moeda de destino
 * @returns Valor convertido ou null se moeda inválida
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string
): number | null {
  const fromUpper = from.toUpperCase() as SupportedCurrency;
  const toUpper = to.toUpperCase() as SupportedCurrency;

  if (!isSupported(fromUpper) || !isSupported(toUpper)) {
    return null;
  }

  if (!Number.isFinite(amount)) {
    return null;
  }

  const rateFrom = EXCHANGE_RATES[fromUpper];
  const rateTo = EXCHANGE_RATES[toUpper];

  const inUsd = amount / rateFrom;
  const result = inUsd * rateTo;

  return Number(result.toFixed(2));
}

/** Verifica se moeda é suportada */
function isSupported(currency: string): currency is SupportedCurrency {
  return currency in EXCHANGE_RATES;
}

/** Retorna taxas disponíveis (para debug/UI) */
export function getExchangeRates(): Record<SupportedCurrency, number> {
  return { ...EXCHANGE_RATES };
}
