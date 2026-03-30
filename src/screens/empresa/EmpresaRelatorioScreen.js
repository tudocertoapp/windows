import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { useTheme } from '../../contexts/ThemeContext';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useFinance } from '../../contexts/FinanceContext';
import { useProfile } from '../../contexts/ProfileContext';
import { GlassCard } from '../../components/GlassCard';
import { DatePickerInput } from '../../components/DatePickerInput';
import { playTapSound } from '../../utils/sounds';
import { formatCurrency } from '../../utils/format';
import { useLanguage } from '../../contexts/LanguageContext';
import { buildEmpresaRelatorioWorkbook } from '../../utils/empresaRelatorioXlsx';
import { canUseWebDocument, printHtmlInBrowser, downloadXlsxInBrowser } from '../../utils/webRelatorioExport';

function parseDateStr(str) {
  if (!str || !String(str).trim()) return null;
  const s = String(str).trim();
  const parts = s.split(/[/\-]/);
  if (parts.length >= 3) {
    if (parts[0].length === 4) {
      const y = parseInt(parts[0], 10);
      const m = (parseInt(parts[1], 10) || 1) - 1;
      const d = parseInt(parts[2], 10) || 1;
      return new Date(y, m, d);
    }
    const d = parseInt(parts[0], 10) || 1;
    const m = (parseInt(parts[1], 10) || 1) - 1;
    const y = parseInt(parts[2], 10) || new Date().getFullYear();
    return new Date(y, m, d);
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

function formatDate(d) {
  return d ? d.toLocaleDateString('pt-BR') : '—';
}

function formatDateStr(d) {
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const REPORT_TYPES = [
  { id: 'fluxo', label: 'Fluxo de Caixa', icon: 'trending-up-outline', color: '#22c55e' },
  { id: 'produtosVendem', label: 'Produtos que mais vendem', icon: 'cart-outline', color: '#8b5cf6' },
  { id: 'servicos', label: 'Serviços realizados', icon: 'construct-outline', color: '#06b6d4' },
  { id: 'produtos', label: 'Produtos', icon: 'cube-outline', color: '#f59e0b' },
];

function escapeHtml(s) {
  if (s == null || s === '') return '—';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function EmpresaRelatorioScreen({ onClose }) {
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const { profile } = useProfile();
  const { fluxo, vendas } = useEmpresa();
  const { transactions, agendaEvents, products, services, clients } = useFinance();

  const [currentReport, setCurrentReport] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState('mes');
  const [filterDate, setFilterDate] = useState(() => new Date());
  const [periodStart, setPeriodStart] = useState(() => formatDateStr(new Date(new Date().getFullYear(), 0, 1)));
  const [periodEnd, setPeriodEnd] = useState(() => formatDateStr(new Date()));
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [tempStart, setTempStart] = useState(periodStart);
  const [tempEnd, setTempEnd] = useState(periodEnd);

  const adjustFilterDate = useCallback((delta) => {
    setFilterDate((d) => {
      const next = new Date(d);
      if (filter === 'dia') next.setDate(next.getDate() + delta);
      else if (filter === 'mes') next.setMonth(next.getMonth() + delta);
      else next.setFullYear(next.getFullYear() + delta);
      return next;
    });
  }, [filter]);

  const applyPeriodo = useCallback(() => {
    playTapSound();
    setPeriodStart(tempStart);
    setPeriodEnd(tempEnd);
    setShowPeriodModal(false);
  }, [tempStart, tempEnd]);

  const { dateDe, dateAte, filterLabel } = useMemo(() => {
    const ref = filterDate;
    let start, end;
    if (filter === 'periodo') {
      start = parseDateStr(periodStart);
      end = parseDateStr(periodEnd);
      return {
        dateDe: start,
        dateAte: end,
        filterLabel: `${formatDate(start)} a ${formatDate(end)}`,
      };
    }
    if (filter === 'dia') {
      start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { dateDe: start, dateAte: end, filterLabel: formatDate(ref) };
    }
    if (filter === 'mes') {
      start = new Date(ref.getFullYear(), ref.getMonth(), 1);
      end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
      return { dateDe: start, dateAte: end, filterLabel: ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) };
    }
    start = new Date(ref.getFullYear(), 0, 1);
    end = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { dateDe: start, dateAte: end, filterLabel: ref.getFullYear().toString() };
  }, [filter, filterDate, periodStart, periodEnd]);

  const inRange = useCallback((dateStr) => {
    const d = parseDateStr(dateStr);
    if (!d) return false;
    d.setHours(0, 0, 0, 0);
    if (dateDe) {
      const sd = new Date(dateDe);
      sd.setHours(0, 0, 0, 0);
      if (d < sd) return false;
    }
    if (dateAte) {
      const ed = new Date(dateAte);
      ed.setHours(23, 59, 59, 999);
      if (d > ed) return false;
    }
    return true;
  }, [dateDe, dateAte]);

  const fluxoFiltered = useMemo(() => fluxo.filter((f) => inRange(f.data)), [fluxo, inRange]);
  const transactionsFiltered = useMemo(() => transactions.filter((t) => inRange(t.date)), [transactions, inRange]);

  const fluxoCompleto = useMemo(() => {
    const items = [];
    fluxoFiltered.forEach((f) => {
      items.push({
        data: f.data,
        tipo: f.tipo === 'entrada' ? 'Entrada' : 'Saída',
        descricao: f.descricao || f.categoria || '—',
        valor: Number(f.valor || 0),
      });
    });
    transactionsFiltered.forEach((t) => {
      items.push({
        data: t.date,
        tipo: t.type === 'income' ? 'Entrada' : 'Saída',
        descricao: t.description || t.category || '—',
        valor: Number(t.amount || 0),
      });
    });
    return items.sort((a, b) => new Date(a.data) - new Date(b.data));
  }, [fluxoFiltered, transactionsFiltered]);

  const totalEntradas = fluxoCompleto.filter((i) => i.tipo === 'Entrada').reduce((s, i) => s + i.valor, 0);
  const totalSaidas = fluxoCompleto.filter((i) => i.tipo === 'Saída').reduce((s, i) => s + i.valor, 0);
  const saldoFluxo = totalEntradas - totalSaidas;

  const vendasFiltered = useMemo(() => vendas.filter((v) => inRange(v.data)), [vendas, inRange]);
  const produtosMaisVendem = useMemo(() => {
    const map = {};
    vendasFiltered.forEach((v) => {
      const nome = v.produto || 'Sem nome';
      if (!map[nome]) map[nome] = { nome, quantidade: 0, valorTotal: 0 };
      map[nome].quantidade += Number(v.quantidade || 1);
      map[nome].valorTotal += Number(v.valor_total || 0);
    });
    return Object.values(map).sort((a, b) => b.quantidade - a.quantidade);
  }, [vendasFiltered]);

  const servicosRealizados = useMemo(
    () => agendaEvents.filter((e) => e.status === 'concluido' && inRange(e.date)),
    [agendaEvents, inRange]
  );

  const productsFiltered = useMemo(() => {
    if (currentReport !== 'produtos') return products;
    if (filter !== 'periodo') return products;
    const pStart = parseDateStr(periodStart);
    const pEnd = parseDateStr(periodEnd);
    if (!pStart || !pEnd) return products;
    return products.filter((p) => {
      const created = p.createdAt ? new Date(p.createdAt) : null;
      if (!created) return true;
      const c = new Date(created);
      c.setHours(0, 0, 0, 0);
      const s = new Date(pStart);
      s.setHours(0, 0, 0, 0);
      const e = new Date(pEnd);
      e.setHours(23, 59, 59, 999);
      return c >= s && c <= e;
    });
  }, [products, currentReport, filter, periodStart, periodEnd]);

  const handleBack = () => {
    playTapSound();
    if (currentReport) setCurrentReport(null);
    else onClose?.();
  };

  const buildHtmlRelatorio = (tipo) => {
    const dDe = formatDate(dateDe);
    const dAte = formatDate(dateAte);
    const emp = profile?.empresa || profile?.nome || 'Empresa';
    const cnpjCpf = profile?.cnpj || profile?.cpf || '';
    const resp = profile?.nome || '';
    const profissao = profile?.profissao || '';
    const endereco = profile?.endereco || profile?.address || '';
    const telefone = profile?.telefone || profile?.phone || '';
    const email = profile?.email || '';
    const empresaBlock = `
      <div class="empresa-header">
        <h2 class="empresa-nome">${escapeHtml(emp)}</h2>
        ${cnpjCpf ? `<p><b>CNPJ/CPF:</b> ${escapeHtml(cnpjCpf)}</p>` : ''}
        ${resp ? `<p><b>Responsável:</b> ${escapeHtml(resp)}</p>` : ''}
        ${profissao ? `<p><b>Atividade:</b> ${escapeHtml(profissao)}</p>` : ''}
        ${endereco ? `<p><b>Endereço:</b> ${escapeHtml(endereco)}</p>` : ''}
        ${telefone ? `<p><b>Telefone:</b> ${escapeHtml(telefone)}</p>` : ''}
        ${email ? `<p><b>E-mail:</b> ${escapeHtml(email)}</p>` : ''}
      </div>
    `;
    let tableRows = '';

    if (tipo === 'fluxo') {
      tableRows += '<h3>Fluxo de Caixa (' + dDe + ' a ' + dAte + ')</h3><table><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th></tr>';
      fluxoCompleto.forEach((i) => {
        tableRows += `<tr><td>${i.data}</td><td>${i.tipo}</td><td>${i.descricao}</td><td>${formatCurrency(i.valor)}</td></tr>`;
      });
      tableRows += `<tr><td colspan="3"><b>Saldo</b></td><td><b>${formatCurrency(saldoFluxo)}</b></td></tr></table>`;
    }

    if (tipo === 'produtosVendem') {
      tableRows += '<h3>Produtos que mais vendem (' + dDe + ' a ' + dAte + ')</h3><table><tr><th>Produto</th><th>Qtd</th><th>Total</th></tr>';
      produtosMaisVendem.forEach((p) => {
        tableRows += `<tr><td>${p.nome}</td><td>${p.quantidade}</td><td>${formatCurrency(p.valorTotal)}</td></tr>`;
      });
      tableRows += '</table>';
    }

    if (tipo === 'servicos') {
      tableRows += '<h3>Serviços realizados (' + dDe + ' a ' + dAte + ')</h3><table><tr><th>Data</th><th>Descrição</th><th>Cliente</th><th>Valor</th></tr>';
      const servicesList = services || [];
      const clientsList = clients || [];
      servicosRealizados.forEach((s) => {
        const svc = servicesList.find((x) => x.id === s.serviceId);
        const cliente = clientsList.find((c) => c.id === s.clientId);
        tableRows += `<tr><td>${s.date}</td><td>${s.title || svc?.name || '—'}</td><td>${cliente?.name || '—'}</td><td>${formatCurrency(s.amount || 0)}</td></tr>`;
      });
      tableRows += '</table>';
    }

    if (tipo === 'produtos') {
      tableRows += '<h3>Lista de Produtos</h3><table><tr><th>Nome</th><th>Preço</th><th>Estoque</th></tr>';
      productsFiltered.forEach((p) => {
        tableRows += `<tr><td>${p.name || '—'}</td><td>${formatCurrency(p.price || 0)}</td><td>${p.stock ?? '—'}</td></tr>`;
      });
      tableRows += '</table>';
    }

    return `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><style>
        body{font-family:sans-serif;padding:20px;color:#333}
        .empresa-header{background:#f8f9fa;padding:16px;border-radius:8px;margin-bottom:20px;border:1px solid #eee}
        .empresa-nome{color:#22c55e;font-size:18px;margin:0 0 8px 0}
        .empresa-header p{margin:4px 0;font-size:13px;color:#444}
        h2{color:#22c55e;font-size:16px;margin-bottom:4px} h3{margin-top:24px;color:#333}
        table{border-collapse:collapse;width:100%;margin:12px 0}
        th,td{border:1px solid #ddd;padding:8px;text-align:left}
        th{background:#f5f5f5}
      </style></head>
      <body>
        <h2>Relatório Tudo Certo</h2>
        <p style="color:#666;margin-bottom:16px">Período: ${dDe} a ${dAte}</p>
        ${empresaBlock}
        ${tableRows}
      </body></html>
    `;
  };

  const exportPdf = async (tipo) => {
    if (!tipo) return;
    if (canUseWebDocument()) {
      setExporting(true);
      try {
        const html = buildHtmlRelatorio(tipo);
        printHtmlInBrowser(html);
        Alert.alert(
          'Guardar em PDF',
          'Na janela de impressão, escolha Guardar como PDF, Microsoft Print to PDF ou Salvar como PDF como destino.',
        );
      } catch (e) {
        const msg = e?.message || String(e);
        Alert.alert('Erro', 'Não foi possível abrir a impressão.' + (msg ? ` (${msg})` : ''));
      }
      setExporting(false);
      return;
    }
    setExporting(true);
    try {
      const html = buildHtmlRelatorio(tipo);
      const { uri } = await Print.printToFileAsync({ html });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exportar PDF' });
      else Alert.alert('Pronto', 'PDF gerado. Arquivo salvo no dispositivo.');
    } catch (e) {
      const msg = e?.message || String(e);
      Alert.alert('Erro', 'Não foi possível gerar o PDF.' + (msg ? ` (${msg})` : ''));
    }
    setExporting(false);
  };

  const exportXlsx = async (tipo) => {
    if (!tipo) return;
    setExporting(true);
    try {
      const clientsList = clients || [];
      const currencyCode = lang?.currencyCode || 'BRL';
      let wb;
      let sheetName = 'Relatório';
      const periodStr = filterLabel || `${formatDate(dateDe)} a ${formatDate(dateAte)}`;

      if (tipo === 'fluxo') {
        sheetName = 'Fluxo de Caixa';
        const headers = ['Data', 'Tipo', 'Descrição', 'Valor'];
        const tableRows = fluxoCompleto.map((i) => [i.data, i.tipo, i.descricao, Number(i.valor) || 0]);
        wb = buildEmpresaRelatorioWorkbook({
          currencyCode,
          profile,
          filterLabel: periodStr,
          reportTitle: `Fluxo de caixa (${formatDate(dateDe)} a ${formatDate(dateAte)})`,
          sheetName,
          tableHeaders: headers,
          tableRows,
          moneyColumnIndexes: [3],
          footerSummaryRows: [
            ['', '', 'Total entradas', totalEntradas],
            ['', '', 'Total saídas', totalSaidas],
            ['', '', 'Saldo do período', saldoFluxo],
          ],
          moneyColumnIndexesInFooter: [3],
        });
      } else if (tipo === 'produtosVendem') {
        sheetName = 'Produtos mais vendidos';
        const headers = ['Produto', 'Quantidade', 'Valor total'];
        const tableRows = produtosMaisVendem.map((p) => [p.nome, Number(p.quantidade) || 0, Number(p.valorTotal) || 0]);
        wb = buildEmpresaRelatorioWorkbook({
          currencyCode,
          profile,
          filterLabel: periodStr,
          reportTitle: `Produtos que mais vendem (${formatDate(dateDe)} a ${formatDate(dateAte)})`,
          sheetName,
          tableHeaders: headers,
          tableRows,
          moneyColumnIndexes: [2],
        });
      } else if (tipo === 'servicos') {
        sheetName = 'Serviços realizados';
        const headers = ['Data', 'Serviço', 'Cliente', 'Valor'];
        const tableRows = servicosRealizados.map((s) => [
          s.date,
          s.title || '—',
          clientsList.find((c) => c.id === s.clientId)?.name || '—',
          Number(s.amount) || 0,
        ]);
        wb = buildEmpresaRelatorioWorkbook({
          currencyCode,
          profile,
          filterLabel: periodStr,
          reportTitle: `Serviços realizados (${formatDate(dateDe)} a ${formatDate(dateAte)})`,
          sheetName,
          tableHeaders: headers,
          tableRows,
          moneyColumnIndexes: [3],
        });
      } else {
        sheetName = 'Produtos';
        const headers = ['Nome', 'Preço', 'Estoque', 'Código'];
        const tableRows = productsFiltered.map((p) => [p.name || '—', Number(p.price) || 0, p.stock ?? '—', p.code || '—']);
        wb = buildEmpresaRelatorioWorkbook({
          currencyCode,
          profile,
          filterLabel: periodStr,
          reportTitle: 'Cadastro de produtos',
          sheetName,
          tableHeaders: headers,
          tableRows,
          moneyColumnIndexes: [1],
        });
      }

      const fname = `relatorio_${tipo}_${Date.now()}.xlsx`;

      if (canUseWebDocument()) {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        downloadXlsxInBrowser(wbout, fname);
        Alert.alert('Pronto', 'O arquivo Excel foi baixado (pasta de downloads do navegador).');
      } else {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const path = FileSystem.cacheDirectory + fname;
        await FileSystem.writeAsStringAsync(path, wbout, { encoding: 'base64' });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) await Sharing.shareAsync(path, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Exportar Excel' });
        else Alert.alert('Pronto', 'Arquivo salvo. Abra pelo app de arquivos.');
      }
    } catch (e) {
      const msg = e?.message || String(e);
      Alert.alert('Erro', 'Não foi possível exportar.' + (msg ? ` (${msg})` : ''));
    }
    setExporting(false);
  };

  const imprimir = async (tipo) => {
    if (!tipo) return;
    if (canUseWebDocument()) {
      setExporting(true);
      try {
        const html = buildHtmlRelatorio(tipo);
        printHtmlInBrowser(html);
      } catch (e) {
        const msg = e?.message || String(e);
        Alert.alert('Erro', 'Não foi possível imprimir.' + (msg ? ` (${msg})` : ''));
      }
      setExporting(false);
      return;
    }
    setExporting(true);
    try {
      const html = buildHtmlRelatorio(tipo);
      await Print.printAsync({ html });
    } catch (e) {
      const msg = e?.message || String(e);
      Alert.alert('Erro', 'Não foi possível imprimir. Verifique se há impressora disponível.' + (msg ? ` (${msg})` : ''));
    }
    setExporting(false);
  };

  const ExportBtn = ({ icon, label, onPress }) => (
    <TouchableOpacity style={[s.exportBtn, { backgroundColor: colors.primaryRgba?.(0.2), borderColor: colors.primary }]} onPress={onPress} disabled={exporting}>
      {exporting ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name={icon} size={18} color={colors.primary} />}
      <Text style={[s.exportBtnText, { color: colors.primary }]}>{label}</Text>
    </TouchableOpacity>
  );

  const DateFilterBar = () => (
    <View style={{ marginBottom: 16 }}>
      <View style={s.filterRow}>
        {['dia', 'mes', 'ano', 'periodo'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterTab, { backgroundColor: filter === f ? colors.primaryRgba?.(0.25) : colors.primaryRgba?.(0.1) }]}
            onPress={() => { playTapSound(); setFilter(f); }}
          >
            <Text style={[s.filterTabText, { color: colors.text }]}>{f === 'dia' ? 'Dia' : f === 'mes' ? 'Mês' : f === 'ano' ? 'Ano' : 'Período'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {filter === 'periodo' ? (
        <TouchableOpacity
          style={[s.periodoTouch, { backgroundColor: colors.primaryRgba?.(0.15) }]}
          onPress={() => { playTapSound(); setTempStart(periodStart); setTempEnd(periodEnd); setShowPeriodModal(true); }}
        >
          <Text style={[s.periodoLabel, { color: colors.text }]}>{filterLabel}</Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>Toque para alterar</Text>
        </TouchableOpacity>
      ) : (
        <View style={s.navRow}>
          <TouchableOpacity onPress={() => { playTapSound(); adjustFilterDate(-1); }} style={{ padding: 6, borderRadius: 8, backgroundColor: colors.primaryRgba?.(0.2) }}>
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{filterLabel}</Text>
          <TouchableOpacity onPress={() => { playTapSound(); adjustFilterDate(1); }} style={{ padding: 6, borderRadius: 8, backgroundColor: colors.primaryRgba?.(0.2) }}>
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (currentReport) {
    const report = REPORT_TYPES.find((r) => r.id === currentReport);
    const showDateFilter = currentReport !== 'produtos';
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleBack} style={s.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>{report?.label}</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {showDateFilter ? (
            <GlassCard colors={colors} style={[s.card, { borderColor: colors.border }]}>
              <Text style={[s.sectionLabel, { color: colors.textSecondary, marginBottom: 10 }]}>FILTRO DE PERÍODO</Text>
              <DateFilterBar />
            </GlassCard>
          ) : (
            <GlassCard colors={colors} style={[s.card, { borderColor: colors.border }]}>
              <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Catálogo de produtos</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>Produtos cadastrados. Use período para filtrar por data de cadastro.</Text>
              <DateFilterBar />
            </GlassCard>
          )}

          {currentReport === 'fluxo' && (
            <GlassCard colors={colors} style={[s.card, { borderColor: colors.border }]}>
              <Text style={[s.periodLabel, { color: colors.textSecondary }]}>{filterLabel}</Text>
              <View style={s.statsRow}>
                <View style={[s.statBox, { backgroundColor: '#22c55e20', borderColor: '#22c55e40' }]}>
                  <Text style={[s.statLabel, { color: colors.textSecondary }]}>Entradas</Text>
                  <Text style={[s.statValor, { color: '#22c55e' }]}>{formatCurrency(totalEntradas)}</Text>
                </View>
                <View style={[s.statBox, { backgroundColor: '#ef444420', borderColor: '#ef444440' }]}>
                  <Text style={[s.statLabel, { color: colors.textSecondary }]}>Saídas</Text>
                  <Text style={[s.statValor, { color: '#ef4444' }]}>{formatCurrency(totalSaidas)}</Text>
                </View>
                <View style={[s.statBox, { backgroundColor: colors.primaryRgba?.(0.15), borderColor: colors.primary + '40' }]}>
                  <Text style={[s.statLabel, { color: colors.textSecondary }]}>Saldo</Text>
                  <Text style={[s.statValor, { color: colors.text }]}>{formatCurrency(saldoFluxo)}</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                <View style={[s.tableWrap, { borderColor: colors.border }]}>
                  <View style={[s.tableRow, s.tableHeader, { borderColor: colors.border }]}>
                    <Text style={[s.tableCell, s.tableHeaderText, { color: colors.text }]}>Data</Text>
                    <Text style={[s.tableCell, s.tableHeaderText, { color: colors.text }]}>Tipo</Text>
                    <Text style={[s.tableCell, s.tableHeaderText, { color: colors.text }]}>Descrição</Text>
                    <Text style={[s.tableCell, s.tableHeaderText, { color: colors.text }]}>Valor</Text>
                  </View>
                  {fluxoCompleto.slice(0, 50).map((i, idx) => (
                    <View key={idx} style={[s.tableRow, { borderColor: colors.border }]}>
                      <Text style={[s.tableCell, { color: colors.text }]}>{i.data}</Text>
                      <Text style={[s.tableCell, { color: i.tipo === 'Entrada' ? '#22c55e' : '#ef4444' }]}>{i.tipo}</Text>
                      <Text style={[s.tableCell, { color: colors.text }]} numberOfLines={1}>{i.descricao}</Text>
                      <Text style={[s.tableCell, { color: colors.text }]}>{formatCurrency(i.valor)}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
              {fluxoCompleto.length > 50 && <Text style={[s.hint, { color: colors.textSecondary }]}>Mostrando 50 de {fluxoCompleto.length}. Exporte para ver todos.</Text>}
            </GlassCard>
          )}

          {currentReport === 'produtosVendem' && (
            <GlassCard colors={colors} style={[s.card, { borderColor: colors.border }]}>
              <Text style={[s.periodLabel, { color: colors.textSecondary }]}>{filterLabel}</Text>
              <View style={[s.tableWrap, { borderColor: colors.border }]}>
                <View style={[s.tableRow, s.tableHeader, { borderColor: colors.border }]}>
                  <Text style={[s.tableCell, s.tableHeaderText, { color: colors.text }]}>Produto</Text>
                  <Text style={[s.tableCell, s.tableHeaderText, { color: colors.text }]}>Qtd</Text>
                  <Text style={[s.tableCell, s.tableHeaderText, { color: colors.text }]}>Total</Text>
                </View>
                {produtosMaisVendem.length === 0 ? (
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>Nenhuma venda no período</Text>
                ) : (
                  produtosMaisVendem.map((p, idx) => (
                    <View key={idx} style={[s.tableRow, { borderColor: colors.border }]}>
                      <Text style={[s.tableCell, { color: colors.text, flex: 2 }]} numberOfLines={1}>{p.nome}</Text>
                      <Text style={[s.tableCell, { color: colors.text }]}>{p.quantidade}</Text>
                      <Text style={[s.tableCell, { color: colors.primary }]}>{formatCurrency(p.valorTotal)}</Text>
                    </View>
                  ))
                )}
              </View>
            </GlassCard>
          )}

          {currentReport === 'servicos' && (
            <GlassCard colors={colors} style={[s.card, { borderColor: colors.border }]}>
              <Text style={[s.periodLabel, { color: colors.textSecondary }]}>{filterLabel}</Text>
              <View style={[s.tableWrap, { borderColor: colors.border }]}>
                <View style={[s.tableRow, s.tableHeader, { borderColor: colors.border }]}>
                  <Text style={[s.tableCell, s.tableHeaderText, { color: colors.text }]}>Data</Text>
                  <Text style={[s.tableCell, s.tableHeaderText, { color: colors.text }]}>Serviço</Text>
                  <Text style={[s.tableCell, s.tableHeaderText, { color: colors.text }]}>Valor</Text>
                </View>
                {servicosRealizados.length === 0 ? (
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>Nenhum serviço concluído no período</Text>
                ) : (
                  servicosRealizados.map((s, idx) => (
                    <View key={s.id || idx} style={[s.tableRow, { borderColor: colors.border }]}>
                      <Text style={[s.tableCell, { color: colors.text }]}>{s.date}</Text>
                      <Text style={[s.tableCell, { color: colors.text, flex: 2 }]} numberOfLines={1}>{s.title || services.find((x) => x.id === s.serviceId)?.name || '—'}</Text>
                      <Text style={[s.tableCell, { color: colors.primary }]}>{formatCurrency(s.amount || 0)}</Text>
                    </View>
                  ))
                )}
              </View>
            </GlassCard>
          )}

          {currentReport === 'produtos' && (
            <GlassCard colors={colors} style={[s.card, { borderColor: colors.border }]}>
              <View style={[s.tableWrap, { borderColor: colors.border }]}>
                <View style={[s.tableRow, s.tableHeader, { borderColor: colors.border }]}>
                  <Text style={[s.tableCell, s.tableHeaderText, { color: colors.text }]}>Nome</Text>
                  <Text style={[s.tableCell, s.tableHeaderText, { color: colors.text }]}>Preço</Text>
                  <Text style={[s.tableCell, s.tableHeaderText, { color: colors.text }]}>Estoque</Text>
                </View>
                {productsFiltered.length === 0 ? (
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>Nenhum produto cadastrado</Text>
                ) : (
                  productsFiltered.map((p) => (
                    <View key={p.id} style={[s.tableRow, { borderColor: colors.border }]}>
                      <Text style={[s.tableCell, { color: colors.text, flex: 2 }]} numberOfLines={1}>{p.name || '—'}</Text>
                      <Text style={[s.tableCell, { color: colors.text }]}>{formatCurrency(p.price || 0)}</Text>
                      <Text style={[s.tableCell, { color: colors.text }]}>{p.stock ?? '—'}</Text>
                    </View>
                  ))
                )}
              </View>
            </GlassCard>
          )}

          <GlassCard colors={colors} style={[s.card, { borderColor: colors.border }]}>
            <Text style={[s.sectionLabel, { color: colors.textSecondary, marginBottom: 10 }]}>EXPORTAR / IMPRIMIR</Text>
            <View style={s.exportRow}>
              <ExportBtn icon="document-text-outline" label="PDF" onPress={() => exportPdf(currentReport)} />
              <ExportBtn icon="grid-outline" label="XLSX" onPress={() => exportXlsx(currentReport)} />
            </View>
            <TouchableOpacity style={[s.printBtn, { backgroundColor: colors.primary }]} onPress={() => imprimir(currentReport)} disabled={exporting}>
              <Ionicons name="print-outline" size={22} color="#fff" />
              <Text style={s.printBtnText}>Imprimir</Text>
            </TouchableOpacity>
          </GlassCard>
        </ScrollView>

        <Modal visible={showPeriodModal} transparent animationType="fade">
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowPeriodModal(false)}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[s.modalBox, { backgroundColor: colors.card }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Filtrar por período</Text>
              <View style={s.modalRow}>
                <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Data inicial</Text>
                <DatePickerInput value={tempStart} onChange={setTempStart} colors={colors} placeholder="01/01/2025" />
              </View>
              <View style={s.modalRow}>
                <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Data final</Text>
                <DatePickerInput value={tempEnd} onChange={setTempEnd} colors={colors} placeholder="31/12/2025" />
              </View>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.primary }]} onPress={applyPeriodo}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Aplicar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.border }]} onPress={() => setShowPeriodModal(false)}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['left', 'right', 'bottom']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Relatórios</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {REPORT_TYPES.map((r) => (
          <TouchableOpacity key={r.id} onPress={() => { playTapSound(); setCurrentReport(r.id); }} activeOpacity={0.8}>
            <GlassCard colors={colors} style={[s.reportCard, { borderColor: r.color + '60', borderWidth: 1 }]} contentStyle={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={[s.iconBox, { backgroundColor: r.color + '25' }]}>
                  <Ionicons name={r.icon} size={26} color={r.color} />
                </View>
                <Text style={[s.cardTitle, { color: colors.text }]}>{r.label}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
              </View>
            </GlassCard>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  reportCard: { marginBottom: 12, borderRadius: 16 },
  card: { marginBottom: 16, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  filterTab: { flex: 1, minWidth: 60, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  filterTabText: { fontSize: 11, fontWeight: '600' },
  periodoLabel: { fontSize: 12 },
  periodoTouch: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.05)' },
  periodoLabel: { fontSize: 12, fontWeight: '600' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  periodLabel: { fontSize: 12, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statBox: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1 },
  statLabel: { fontSize: 11, marginBottom: 4 },
  statValor: { fontSize: 16, fontWeight: '800' },
  tableWrap: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1 },
  tableHeader: { backgroundColor: 'rgba(0,0,0,0.05)' },
  tableHeaderText: { fontWeight: '700', fontSize: 12 },
  tableCell: { flex: 1, fontSize: 12 },
  emptyText: { padding: 16, textAlign: 'center', fontSize: 13 },
  hint: { fontSize: 11, marginTop: 4 },
  exportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  exportBtnText: { fontSize: 13, fontWeight: '600' },
  printBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  printBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalBox: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  modalRow: { marginBottom: 12 },
  modalLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  modalBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
});
