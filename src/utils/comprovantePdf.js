import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatCurrency } from './format';

function formatDate(str) {
  if (!str) return '—';
  const d = typeof str === 'string' && str.includes('T') ? new Date(str) : new Date(str);
  return isNaN(d.getTime()) ? str : d.toLocaleDateString('pt-BR');
}

export function buildComprovanteHtml({ numero, data, cliente, items, total, formaPagamento }, profile) {
  const rows = (items || [])
    .map(
      (i) =>
        `<tr><td>${(i.name || '—').replace(/</g, '&lt;')}</td><td>${i.qty || 1}</td><td>${formatCurrency(((i.price || 0) - (i.discount || 0)) * (i.qty || 1))}</td></tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body{font-family:sans-serif;padding:24px;color:#333;font-size:13px}
  h1{color:#22c55e;font-size:20px;margin-bottom:4px}
  .header{text-align:center;margin-bottom:24px}
  .cliente{background:#f8f9fa;padding:12px;border-radius:8px;margin-bottom:16px}
  table{border-collapse:collapse;width:100%;margin:16px 0}
  th,td{border:1px solid #ddd;padding:8px}
  th{background:#f5f5f5}
  .total{font-size:18px;font-weight:700;color:#22c55e}
</style></head>
<body>
  <div class="header">
    <h1>COMPROVANTE DE VENDA</h1>
    <p>${profile?.empresa || profile?.nome || 'Tudo Certo'}</p>
  </div>
  <p><b>Nº da venda:</b> ${(numero || '—').replace(/</g, '&lt;')}</p>
  <p><b>Data:</b> ${formatDate(data)}</p>
  <p><b>Forma de pagamento:</b> ${(formaPagamento || '—').replace(/</g, '&lt;')}</p>
  <div class="cliente">
    <p><b>Cliente:</b> ${(cliente?.name || '—').replace(/</g, '&lt;')}</p>
    ${cliente?.phone ? `<p>Tel: ${cliente.phone}</p>` : ''}
  </div>
  <table>
    <tr><th>Descrição</th><th>Qtd</th><th>Valor</th></tr>
    ${rows}
  </table>
  <p class="total">TOTAL: ${formatCurrency(total || 0)}</p>
</body></html>
  `;
}

export async function generateComprovantePdf(comprovanteData, profile) {
  const html = buildComprovanteHtml(comprovanteData, profile);
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function shareComprovantePdf(comprovanteData, profile) {
  const uri = await generateComprovantePdf(comprovanteData, profile);
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Comprovante PDF' });
  return uri;
}
