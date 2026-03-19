import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatCurrency } from './format';

function formatDate(str) {
  if (!str) return '—';
  const d = typeof str === 'string' && str.includes('T') ? new Date(str) : new Date(str);
  return isNaN(d.getTime()) ? str : d.toLocaleDateString('pt-BR');
}

export function buildOrcamentoHtml(orcamento, cliente, profile) {
  const items = orcamento.items || [];
  const rows = items
    .map(
      (i) =>
        `<tr><td>${(i.name || '—').replace(/</g, '&lt;')}</td><td>${i.qty || 1}</td><td>${formatCurrency(i.price || 0)}</td><td>${formatCurrency(i.discount || 0)}</td><td>${formatCurrency(((i.price || 0) - (i.discount || 0)) * (i.qty || 1))}</td></tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body{font-family:sans-serif;padding:24px;color:#333;font-size:13px}
  h1{color:#22c55e;font-size:20px;margin-bottom:4px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
  .cliente{background:#f8f9fa;padding:12px;border-radius:8px;margin-bottom:16px}
  .cliente h3{margin:0 0 8px;font-size:12px;color:#666}
  table{border-collapse:collapse;width:100%;margin:16px 0}
  th,td{border:1px solid #ddd;padding:8px;text-align:left}
  th{background:#f5f5f5;font-size:11px}
  .total-row{font-weight:700;background:#f0fdf4}
  .footer{margin-top:24px;font-size:11px;color:#666}
</style></head>
<body>
  <h1>ORÇAMENTO</h1>
  <p style="margin:0;color:#666">${profile?.empresa || profile?.nome || 'Tudo Certo'}</p>
  <div class="header">
    <div>
      <p><b>Nº:</b> ${(orcamento.numero || '—').replace(/</g, '&lt;')}</p>
      <p><b>Data:</b> ${formatDate(orcamento.createdAt)}</p>
      ${orcamento.validade ? `<p><b>Validade:</b> ${orcamento.validade}</p>` : ''}
    </div>
  </div>
  <div class="cliente">
    <h3>CLIENTE</h3>
    <p><b>${(cliente?.name || '—').replace(/</g, '&lt;')}</b></p>
    ${cliente?.phone ? `<p>Tel: ${cliente.phone}</p>` : ''}
    ${cliente?.email ? `<p>E-mail: ${cliente.email}</p>` : ''}
    ${cliente?.cpf ? `<p>CPF/CNPJ: ${cliente.cpf}</p>` : ''}
    ${cliente?.address ? `<p>Endereço: ${cliente.address}</p>` : ''}
  </div>
  <table>
    <tr><th>Descrição</th><th>Qtd</th><th>Valor Unit.</th><th>Desconto</th><th>Subtotal</th></tr>
    ${rows}
    <tr class="total-row"><td colspan="4">Subtotal</td><td>${formatCurrency(orcamento.subtotal || 0)}</td></tr>
    <tr class="total-row"><td colspan="4">Desconto</td><td>${formatCurrency(orcamento.desconto || 0)}</td></tr>
    <tr class="total-row"><td colspan="4">TOTAL</td><td>${formatCurrency(orcamento.total || 0)}</td></tr>
  </table>
  ${orcamento.observacoes ? `<p><b>Observações:</b><br/>${(orcamento.observacoes || '').replace(/</g, '&lt;').replace(/\n/g, '<br/>')}</p>` : ''}
  ${orcamento.termos ? `<p><b>Termos:</b><br/>${(orcamento.termos || '').replace(/</g, '&lt;').replace(/\n/g, '<br/>')}</p>` : ''}
  <div class="footer">
    <p>Documento gerado pelo app Tudo Certo</p>
  </div>
</body></html>
  `;
}

export async function generateOrcamentoPdf(orcamento, cliente, profile) {
  const html = buildOrcamentoHtml(orcamento, cliente, profile);
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function shareOrcamentoPdf(orcamento, cliente, profile) {
  const uri = await generateOrcamentoPdf(orcamento, cliente, profile);
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Orçamento PDF' });
  return uri;
}
