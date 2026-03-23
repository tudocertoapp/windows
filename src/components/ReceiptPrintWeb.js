import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { formatLine, truncateText, formatReceiptCurrency } from '../utils/receiptUtils';

const RECEIPT_WIDTH = 48;

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #print-area, #print-area * { visibility: visible !important; }
  #print-area {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 300px !important;
  }
}
`;

export function ReceiptPrintWeb({ sale, empresa }) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !sale) return;
    const id = 'pdv-print-styles';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = PRINT_CSS;
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, [!!sale]);

  if (!sale || Platform.OS !== 'web') return null;

  const hoje = new Date();
  const dataStr = hoje.toLocaleDateString('pt-BR');
  const horaStr = hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const nomeEmpresa = truncateText(empresa?.empresa || empresa?.nome || 'Empresa', RECEIPT_WIDTH);
  const cnpjCpf = truncateText(empresa?.cnpj || empresa?.cpf || '', RECEIPT_WIDTH);
  const endereco = truncateText(empresa?.endereco || '', RECEIPT_WIDTH);

  const clienteNome = truncateText(sale.cliente?.name || 'Consumidor Final', RECEIPT_WIDTH);
  const clienteDoc = truncateText(sale.cliente?.cpf || sale.cliente?.cnpj || '', RECEIPT_WIDTH);

  const subtotal = sale.subtotal ?? 0;
  const desconto = sale.desconto ?? 0;
  const total = sale.total ?? 0;
  const pago = sale.pago ?? 0;
  const troco = Math.max(0, pago - total);

  return (
    <View id="print-area" style={styles.container} aria-hidden="true">
      <pre style={styles.pre}>
        {`${'='.repeat(RECEIPT_WIDTH)}
${nomeEmpresa}
${cnpjCpf}
${endereco}
${'='.repeat(RECEIPT_WIDTH)}
      CUPOM NAO FISCAL
${formatLine('Venda:', `#${sale.numero || '001'}`)}
${formatLine('Data:', dataStr)}
${formatLine('Hora:', horaStr)}
${'-'.repeat(RECEIPT_WIDTH)}
CLIENTE
${clienteNome}
${clienteDoc || ''}
${'-'.repeat(RECEIPT_WIDTH)}
COD  DESCRICAO              QTD  VL.UN    VL.TOTAL
${'-'.repeat(RECEIPT_WIDTH)}
${(sale.items || []).map((i) => {
  const cod = truncateText(i.code || i.id?.slice(-6) || '-', 5);
  const desc = truncateText(i.name, 20);
  const qtd = String(i.qty || 1).padStart(3);
  const vlUn = formatReceiptCurrency(i.price || 0).padStart(8);
  const vlTot = formatReceiptCurrency((i.price || 0) * (i.qty || 1)).padStart(10);
  return `${cod}  ${desc.padEnd(20)} ${qtd} ${vlUn} ${vlTot}`;
}).join('\n')}
${'-'.repeat(RECEIPT_WIDTH)}
${formatLine('Subtotal:', formatReceiptCurrency(subtotal))}
${formatLine('Desconto:', formatReceiptCurrency(desconto))}
${formatLine('TOTAL:', formatReceiptCurrency(total))}
${'-'.repeat(RECEIPT_WIDTH)}
PAGAMENTOS
${(sale.payments || []).map((p) => {
  const parcelas = p.parcelas > 1 ? ` (${p.parcelas}x)` : '';
  return formatLine(`${p.forma}${parcelas}:`, formatReceiptCurrency(p.valor));
}).join('\n')}
${troco > 0 ? `${formatLine('Troco:', formatReceiptCurrency(troco))}\n` : ''}${'-'.repeat(RECEIPT_WIDTH)}

    Obrigado pela preferencia!

      Cupom nao fiscal
${'='.repeat(RECEIPT_WIDTH)}`}
      </pre>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: -9999,
    top: 0,
    width: 300,
    visibility: 'hidden',
    zIndex: -1,
  },
  pre: {
    fontFamily: 'monospace',
    fontSize: 10,
    lineHeight: 14,
    margin: 0,
    padding: 8,
    color: '#000',
    backgroundColor: '#fff',
    whiteSpace: 'pre',
    width: 300,
  },
});
