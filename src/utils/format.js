export function formatCurrency(value) {
  return 'R$ ' + value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseMoney(str) {
  if (!str || str === '') return 0;
  const s = String(str).replace(/\s/g, '').replace(/[^\d,.\-]/g, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let clean = s;
  if (lastComma > lastDot) {
    clean = s.replace(/\./g, '').replace(',', '.');
  } else {
    clean = s.replace(/,/g, '');
  }
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}
