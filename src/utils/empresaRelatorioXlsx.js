import * as XLSX from 'xlsx';

/** Formatos contábeis (locale Microsoft) — valor numérico na célula */
const ACCOUNTING_NUMFMT = {
  BRL: '[$R$-416] #,##0.00_);[Red]([$R$-416] #,##0.00);[$R$-416] "-"??_);@_)',
  USD: '[$$-409] #,##0.00_);[Red]([$$-409] #,##0.00);[$$-409] "-"??_);@_)',
  EUR: '[$€-1] #,##0.00_);[Red]([$€-1] #,##0.00);[$€-1] "-"??_);@_)',
};

function normalizeCurrencyCode(code) {
  const c = String(code || 'BRL').toUpperCase();
  if (ACCOUNTING_NUMFMT[c]) return c;
  return 'BRL';
}

function isHttpUrl(str) {
  if (!str || typeof str !== 'string') return false;
  return /^https?:\/\//i.test(str.trim());
}

function applyAccountingToColumn(ws, colIndex, startRow, endRow, currencyCode) {
  const fmt = ACCOUNTING_NUMFMT[normalizeCurrencyCode(currencyCode)] || ACCOUNTING_NUMFMT.BRL;
  for (let r = startRow; r <= endRow; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: colIndex });
    const cell = ws[addr];
    if (!cell) continue;
    if (cell.v === '' || cell.v === null || cell.v === undefined) continue;
    const n = Number(cell.v);
    if (!Number.isFinite(n)) continue;
    cell.t = 'n';
    cell.v = n;
    cell.z = fmt;
  }
}

/**
 * @param {object} opts
 * @param {string} opts.currencyCode - BRL | USD | EUR
 * @param {object} opts.profile
 * @param {string} opts.filterLabel
 * @param {string} opts.reportTitle - título da secção do relatório (ex.: Fluxo de Caixa)
 * @param {string} opts.sheetName
 * @param {string[]} opts.tableHeaders
 * @param {any[][]} opts.tableRows - números nas colunas monetárias (não strings)
 * @param {number[]} opts.moneyColumnIndexes - índices 0-based por linha de tableRows
 * @param {any[][]} [opts.footerSummaryRows]
 * @param {number[]} [opts.moneyColumnIndexesInFooter]
 */
export function buildEmpresaRelatorioWorkbook({
  currencyCode = 'BRL',
  profile = {},
  filterLabel = '',
  reportTitle = 'Relatório',
  sheetName = 'Relatório',
  tableHeaders = [],
  tableRows = [],
  moneyColumnIndexes = [],
  footerSummaryRows = [],
  moneyColumnIndexesInFooter = [],
}) {
  const cc = normalizeCurrencyCode(currencyCode);
  const emp = profile.empresa || profile.nome || '—';
  const nomeResp = profile.nome || '';
  const cnpj = profile.cnpj || profile.cpf || '';
  const prof = profile.profissao || '';
  const end = profile.endereco || profile.address || '';
  const tel = profile.telefone || profile.phone || '';
  const email = profile.email || '';
  const fotoUrl = profile.foto || '';

  const rows = [];
  rows.push(['Tudo Certo — Relatório empresarial']);
  rows.push([`Período / filtro: ${filterLabel || '—'}`]);
  rows.push([]);
  const rowDadosEmpresa = rows.length;
  rows.push(['Dados da empresa']);
  rows.push(['Campo', 'Informação']);
  rows.push(['Razão social / Nome fantasia', emp]);
  rows.push(['Responsável', nomeResp || '—']);
  rows.push(['CNPJ / CPF', cnpj || '—']);
  rows.push(['Atividade / Profissão', prof || '—']);
  rows.push(['Endereço', end || '—']);
  rows.push(['Telefone', tel || '—']);
  rows.push(['E-mail', email || '—']);
  rows.push(['Moeda (exportação Excel)', cc]);
  let logoRowIndex = -1;
  if (isHttpUrl(fotoUrl)) {
    logoRowIndex = rows.length;
    rows.push(['Logotipo (URL)', fotoUrl]);
  } else if (fotoUrl) {
    rows.push(['Logotipo', 'Cadastrado no perfil (arquivo local / aplicativo)']);
  } else {
    rows.push(['Logotipo', 'Não cadastrado']);
  }
  rows.push([]);
  const rowReportTitle = rows.length;
  rows.push([reportTitle]);
  const rowTableHeader = rows.length;
  rows.push(tableHeaders);
  tableRows.forEach((r) => rows.push(r));
  let rowFooterStart = -1;
  if (footerSummaryRows.length) {
    rows.push([]);
    rowFooterStart = rows.length;
    footerSummaryRows.forEach((r) => rows.push(r));
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  const lastCol = Math.max(tableHeaders.length - 1, 1, 5);
  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: rowDadosEmpresa, c: 0 }, e: { r: rowDadosEmpresa, c: 1 } },
    { s: { r: rowReportTitle, c: 0 }, e: { r: rowReportTitle, c: Math.max(tableHeaders.length - 1, 1) } },
  ];
  ws['!merges'] = merges;

  ws['!cols'] = Array.from({ length: lastCol + 1 }, (_, i) => ({
    wch: i === 0 ? 30 : i === 1 ? 44 : 16,
  }));

  const dataBodyStart = rowTableHeader + 1;
  const dataBodyEnd = rowTableHeader + tableRows.length;
  moneyColumnIndexes.forEach((colIdx) => {
    applyAccountingToColumn(ws, colIdx, dataBodyStart, dataBodyEnd, cc);
  });

  if (footerSummaryRows.length && rowFooterStart >= 0 && moneyColumnIndexesInFooter.length) {
    const footerEnd = rowFooterStart + footerSummaryRows.length - 1;
    moneyColumnIndexesInFooter.forEach((colIdx) => {
      applyAccountingToColumn(ws, colIdx, rowFooterStart, footerEnd, cc);
    });
  }

  if (logoRowIndex >= 0 && isHttpUrl(fotoUrl)) {
    const addr = XLSX.utils.encode_cell({ r: logoRowIndex, c: 1 });
    ws[addr] = {
      t: 's',
      v: 'Abrir logotipo no navegador',
      l: { Target: fotoUrl.trim(), Tooltip: 'Logo da empresa' },
    };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, String(sheetName).slice(0, 31));
  return wb;
}

export { normalizeCurrencyCode, ACCOUNTING_NUMFMT };
