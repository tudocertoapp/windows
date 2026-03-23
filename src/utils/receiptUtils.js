const RECEIPT_WIDTH = 48;

/** Formata valor no padrão cupom: R$ 10,00 */
export function formatReceiptCurrency(value) {
  const n = Number(value) || 0;
  return 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Alinha left e right na largura fixa (48 caracteres) */
export function formatLine(left, right, width = RECEIPT_WIDTH) {
  const l = String(left || '').slice(0, width - 2);
  const r = String(right || '');
  const pad = Math.max(0, width - l.length - r.length);
  return l + ' '.repeat(pad) + r;
}

/** Trunca texto evitando quebra de layout */
export function truncateText(text, max = RECEIPT_WIDTH) {
  const s = String(text || '').trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 2) + '..';
}
