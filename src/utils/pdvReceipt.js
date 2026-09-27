function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function moneyLabel(value) {
  return `R$ ${money(value)}`;
}

function line(text) {
  const s = String(text || '').trim();
  return s ? `<div class="center muted">${esc(s)}</div>` : '';
}

function docLabel(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length > 11 ? `CNPJ: ${value}` : `CPF: ${value}`;
}

function formatWhen(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return { data: '', hora: '' };
  return {
    data: d.toLocaleDateString('pt-BR'),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    full: d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function addressLines(empresa) {
  if (!empresa) return [];
  const lines = [];
  const rua = String(empresa.endereco_rua || '').trim();
  const num = String(empresa.endereco_numero || '').trim();
  if (rua) lines.push(num ? `${rua}, ${num}` : rua);
  const comp = String(empresa.endereco_complemento || '').trim();
  if (comp) lines.push(comp);
  const bairro = String(empresa.endereco_bairro || '').trim();
  if (bairro) lines.push(bairro);
  const cidade = String(empresa.endereco_cidade || '').trim();
  const uf = String(empresa.endereco_estado || '').trim();
  if (cidade && uf) lines.push(`${cidade}, ${uf.toUpperCase()}`);
  else if (cidade) lines.push(cidade);
  const cep = String(empresa.endereco_cep || '').trim();
  if (cep) lines.push(`CEP ${cep}`);
  if (!lines.length && empresa.endereco) lines.push(String(empresa.endereco));
  return lines;
}

export function buildPdvReceiptHtml(sale, empresa, options = {}) {
  const when = formatWhen(sale?.soldAt);
  const show = {
    logo: options.showLogo !== false,
    email: options.showEmail !== false,
    documento: options.showDocumento !== false,
    telefone: options.showTelefone !== false,
    endereco: options.showEndereco !== false,
    instagram: options.showInstagram === true,
    numero: options.showNumero !== false,
    vendedor: options.showVendedor !== false,
  };
  const store = empresa?.empresa || empresa?.nome || 'Tudo Certo';
  const doc = show.documento ? docLabel(empresa?.cnpj) : '';
  const addrs = show.endereco ? addressLines(empresa) : [];
  const phone = show.telefone ? String(empresa?.telefone || '').trim() : '';
  const email = show.email ? String(empresa?.email || '').trim() : '';
  const instagram = show.instagram ? String(empresa?.instagram || '').trim() : '';
  const logoUrl = show.logo ? String(options.logoUrl || '').trim() : '';
  const rodape = String(options.rodape || '').trim();

  const cliente = sale?.cliente;
  const clienteNome = cliente?.name || 'Cliente final';
  const clienteBits = [
    cliente?.cpf ? docLabel(cliente.cpf) : '',
    cliente?.phone ? `Tel: ${cliente.phone}` : '',
    cliente?.email || '',
    cliente?.address || '',
  ].filter(Boolean);

  const items = Array.isArray(sale?.items) ? sale.items : [];
  const qtyTotal = items.reduce((acc, item) => acc + (Number(item.qty) || 1), 0);
  const subtotalBruto = sale?.subtotalBruto ?? sale?.subtotal ?? 0;
  const desconto = sale?.desconto ?? 0;
  const total = sale?.total ?? 0;
  const pago = sale?.pago ?? 0;
  const troco = Math.max(0, Number(sale?.troco ?? pago - total) || 0);
  const payments = Array.isArray(sale?.payments) ? sale.payments : [];

  const itemRows = items.map((item, index) => {
    const qty = Number(item.qty) || 1;
    const unit = Number(item.originalPrice ?? item.price) || 0;
    const descUnit = Number(item.descontoUnit) || 0;
    const descTotal = descUnit * qty;
    const lineTotal = (Number(item.price) || 0) * qty;
    const code = item.code ? `<div class="code">${esc(item.code)}</div>` : '';
    return `<tr>
      <td class="center">${index + 1}</td>
      <td>${esc(item.name || 'Item')}${code}</td>
      <td class="right">${money(unit)}</td>
      <td class="center">${qty}</td>
      <td class="right">${money(descTotal)}</td>
      <td class="right">${money(lineTotal)}</td>
    </tr>`;
  }).join('');

  const paymentRows = payments.map((p, index) => {
    const parcelas = Number(p.parcelas) > 1 ? ` (${p.parcelas}x)` : '';
    return `<tr>
      <td class="center">${index + 1}</td>
      <td>${esc(p.forma || 'Pagamento')}${esc(parcelas)}</td>
      <td class="right">${money(p.valor)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Venda ${esc(sale?.numero || '')}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
    .ticket { width: 72mm; margin: 0 auto; }
    .logo { display: block; width: 64px; height: 64px; object-fit: contain; margin: 4px auto 2px; }
    h1 { margin: 6px 0 2px; text-align: center; font-size: 16px; letter-spacing: 0.2px; }
    .center { text-align: center; }
    .muted { color: #222; font-size: 10px; line-height: 1.35; }
    .badge { text-align: center; font-size: 10px; letter-spacing: 0.6px; margin: 4px 0 8px; }
    .sale { text-align: center; font-size: 14px; font-weight: 700; margin: 8px 0 4px; }
    .meta { display: flex; justify-content: space-between; gap: 8px; font-size: 10px; margin: 1px 0; }
    .section { margin: 8px 0 3px; font-size: 11px; font-weight: 700; }
    .box { border: 1px solid #222; padding: 4px 6px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #222; padding: 3px 2px; font-size: 9px; vertical-align: top; }
    th { font-weight: 700; background: #f4f4f4; }
    .right { text-align: right; white-space: nowrap; }
    .code { color: #444; font-size: 8px; }
    .sum { display: flex; justify-content: space-between; margin: 2px 0; font-size: 11px; }
    .sum strong { font-size: 13px; }
    .footer { text-align: center; margin-top: 12px; }
    .footer .brand { font-weight: 700; font-size: 13px; }
    hr { border: 0; border-top: 1px dashed #444; margin: 8px 0; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="center muted">${esc(when.full || '')}</div>
    ${logoUrl ? `<img class="logo" src="${esc(logoUrl)}" alt="Logo" />` : ''}
    <h1>${esc(store)}</h1>
    ${doc ? line(doc) : ''}
    ${addrs.map((l) => line(l)).join('')}
    ${phone ? line(phone) : ''}
    ${email ? line(email) : ''}
    ${instagram ? line(`Instagram: ${instagram}`) : ''}
    <div class="badge">CUPOM NÃO FISCAL</div>
    ${show.numero ? `<div class="sale">Venda #${esc(sale?.numero || '0001')}</div>` : ''}
    <div class="meta"><span>Data / Hora</span><span>${esc(when.full || '')}</span></div>
    ${show.vendedor ? `<div class="meta"><span>Vendedor</span><span>${esc(sale?.operador || 'Operador')}</span></div>` : ''}
    ${sale?.transacaoId ? `<div class="meta"><span>Registro</span><span>${esc(String(sale.transacaoId).slice(0, 12))}</span></div>` : ''}
    <div class="section">Cliente</div>
    <div class="box">
      <div>${esc(clienteNome)}</div>
      ${clienteBits.map((b) => `<div class="muted">${esc(b)}</div>`).join('')}
    </div>
    <div class="section">Produtos / Serviços</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Produto / Serviço</th>
          <th>R$ Unit.</th>
          <th>Qtd</th>
          <th>R$ Desc.</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows || '<tr><td colspan="6" class="center">Sem itens</td></tr>'}
      </tbody>
    </table>
    <div class="sum"><span>Quantidade total</span><span>${qtyTotal}</span></div>
    <div class="sum"><span>Valor dos itens</span><span>${moneyLabel(subtotalBruto)}</span></div>
    <div class="section">Pagamentos</div>
    <table>
      <thead>
        <tr><th>#</th><th>Forma de pagamento</th><th>Valor</th></tr>
      </thead>
      <tbody>
        ${paymentRows || '<tr><td colspan="3" class="center">Sem pagamento</td></tr>'}
      </tbody>
    </table>
    ${troco > 0 ? `<div class="sum"><span>Troco</span><span>${moneyLabel(troco)}</span></div>` : ''}
    <div class="section">Totais</div>
    <div class="box">
      <div class="sum"><span>Produtos / Serviços</span><span>${moneyLabel(subtotalBruto)}</span></div>
      <div class="sum"><span>Descontos</span><span>${moneyLabel(desconto)}</span></div>
      <div class="sum"><span>Adicionais</span><span>${moneyLabel(0)}</span></div>
      <div class="sum"><span>Total recebido</span><span>${moneyLabel(pago)}</span></div>
      <hr />
      <div class="sum"><strong>Total líquido</strong><strong>${moneyLabel(total)}</strong></div>
    </div>
    <div class="footer">
      <div class="brand">${esc(store)}</div>
      <div class="muted">${esc(rodape || 'Obrigado pela preferência')}</div>
    </div>
  </div>
</body>
</html>`;
}

export function printPdvReceipt(sale, empresa, options) {
  if (!sale || typeof document === 'undefined') return;
  const html = buildPdvReceiptHtml(sale, empresa, options);
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  const doc = win.document;
  doc.open();
  doc.write(html);
  doc.close();
  const run = () => {
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 1500);
  };
  setTimeout(run, 80);
}
