function fold(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PAGES = [
  { re: /\b(calculadora|calculador|calc)\b/, target: 'calculator', label: 'calculadora' },
  { re: /\b(inicio|home|dashboard|tela inicial)\b/, target: 'home', label: 'início' },
  { re: /\b(dinheiro|financas|financeiro)\b/, target: 'money', label: 'dinheiro' },
  { re: /\bagenda\b/, target: 'agenda', label: 'agenda' },
  { re: /\b(dock|chat|meus gastos)\b/, target: 'dock', label: 'Dock' },
  { re: /\b(whatsapp|crm|mensagens)\b/, target: 'whatsapp', label: 'WhatsApp' },
  { re: /\bprodutos?\b/, target: 'products', label: 'produtos' },
  { re: /\bservicos?\b/, target: 'services', label: 'serviços' },
  { re: /\bclientes?\b/, target: 'clients', label: 'clientes' },
  { re: /\bfornecedor/, target: 'suppliers', label: 'fornecedores' },
  { re: /\b(pdv|abrir caixa|frente de caixa|caixa pdv)\b/, target: 'pdv', label: 'caixa' },
  { re: /\b(catalogo|minha loja|loja)\b/, target: 'catalog', label: 'catálogo' },
  { re: /\banotaco/, target: 'notes', label: 'anotações' },
  { re: /\b(lista de compras|compras)\b/, target: 'shopping', label: 'lista de compras' },
  { re: /\b(a receber|receber)\b/, target: 'receivables', label: 'a receber' },
  { re: /\borcament/, target: 'quotes', label: 'orçamentos' },
  { re: /\bbancos?\b/, target: 'banks', label: 'bancos' },
  { re: /\b(perfil|minha conta)\b/, target: 'profile', label: 'perfil' },
  { re: /\b(assinatura|plano)\b/, target: 'plan', label: 'assinatura' },
  { re: /\b(aniversariante)/, target: 'birthdays', label: 'aniversariantes' },
  { re: /\bempresa\b/, target: 'company', label: 'empresa' },
  { re: /\bcolaborador/, target: 'staff', label: 'colaboradores' },
  { re: /\b(ordem de servico|os\b)/, target: 'workorders', label: 'ordens de serviço' },
  { re: /\b(metas|sonhos)\b/, target: 'goals', label: 'metas' },
  { re: /\b(temas?|aparencia)\b/, target: 'themes', label: 'temas' },
  { re: /\bindique\b/, target: 'referral', label: 'indique' },
  { re: /\b(scanner|comprovante|notinha)\b/, target: 'receipt', label: 'leitura de comprovante' },
  { re: /\b(imagem motivacional|gerador de imagem)\b/, target: 'image', label: 'imagem' },
  { re: /\b(profissional|profissionais)\b/, target: 'professionals', label: 'profissionais' },
  { re: /\b(boleto|faturas?)\b/, target: 'bills', label: 'boletos' },
  { re: /\bmenu\b/, target: 'menu', label: 'menu' },
];

export function detectDockNav(text) {
  const t = fold(text);
  const dataAsk = /\b(quantos?|quanto|qnts|qtd|quantidade|cadastrad|saldo|vendeu|vendas|lucro|gastei|gasto|despesa|compromisso|agendad|horario|hoje tem|o que tem)\b/.test(t);
  const closing = /\b(fecha|fechar|fechando|esconde|esconder|some|desliga|sai da|sair da)\b/.test(t);
  const opening = /\b(abre|abrir|vai para|vai pra|ir para|ir pra|quero abrir|mostra a tela|mostra o|mostra a)\b/.test(t);
  if (dataAsk && !closing && !opening) return null;
  if (!closing && !opening) return null;
  for (const p of PAGES) {
    if (!p.re.test(t)) continue;
    if (closing) return { target: p.target, label: p.label, action: 'close' };
    return { target: p.target, label: p.label, action: 'open' };
  }
  if (closing) return { target: 'calculator', label: 'calculadora', action: 'close' };
  return null;
}
