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
  { re: /\b(inicio|home|dashboard|tela inicial|pagina inicial|pagina home)\b/, target: 'home', label: 'início' },
  { re: /\b(dinheiro|financas|financeiro)\b/, target: 'money', label: 'dinheiro' },
  { re: /\bagenda\b/, target: 'agenda', label: 'agenda' },
  { re: /\b(dock|meus gastos)\b/, target: 'dock', label: 'Dock' },
  { re: /\b(whatsapp|crm|mensagens)\b/, target: 'whatsapp', label: 'WhatsApp' },
  { re: /\bprodutos?\b/, target: 'products', label: 'produtos' },
  { re: /\bservicos?\b/, target: 'services', label: 'serviços' },
  { re: /\bclientes?\b/, target: 'clients', label: 'clientes' },
  { re: /\bfornecedor/, target: 'suppliers', label: 'fornecedores' },
  { re: /\b(pdv|abrir caixa|frente de caixa|caixa pdv)\b/, target: 'pdv', label: 'caixa' },
  { re: /\b(catalogo|minha loja|loja)\b/, target: 'catalog', label: 'catálogo' },
  { re: /\banotaco/, target: 'notes', label: 'anotações' },
  { re: /\b(lista de compras|compras)\b/, target: 'shopping', label: 'lista de compras' },
  { re: /\b(a receber)\b/, target: 'receivables', label: 'a receber' },
  { re: /\borcament/, target: 'quotes', label: 'orçamentos' },
  { re: /\bbancos?\b/, target: 'banks', label: 'bancos' },
  { re: /\b(perfil|minha conta)\b/, target: 'profile', label: 'perfil' },
  { re: /\b(assinatura|plano)\b/, target: 'plan', label: 'assinatura' },
  { re: /\b(aniversariante)/, target: 'birthdays', label: 'aniversariantes' },
  { re: /\bempresa\b/, target: 'company', label: 'empresa' },
  { re: /\bcolaborador/, target: 'staff', label: 'colaboradores' },
  { re: /\b(ordem de servico|\bos\b)/, target: 'workorders', label: 'ordens de serviço' },
  { re: /\b(metas|sonhos)\b/, target: 'goals', label: 'metas' },
  { re: /\b(temas?|aparencia)\b/, target: 'themes', label: 'temas' },
  { re: /\bindique\b/, target: 'referral', label: 'indique' },
  { re: /\b(scanner|comprovante|notinha)\b/, target: 'receipt', label: 'leitura de comprovante' },
  { re: /\b(imagem motivacional|gerador de imagem)\b/, target: 'image', label: 'imagem' },
  { re: /\b(profissional|profissionais)\b/, target: 'professionals', label: 'profissionais' },
  { re: /\b(boleto|faturas?)\b/, target: 'bills', label: 'boletos' },
  { re: /\bmenu\b/, target: 'menu', label: 'menu' },
  { re: /\btarefas?\b/, target: 'tasks', label: 'tarefas' },
];

const OPEN_RE = /\b(abre|abra|abrir|mostra|mostre|mostrar|exibe|exibir|vai para|vai pra|ir para|ir pra|quero abrir|abre pra|abrir a tela|abrir tela|acesse|acessar|acessa|entra em|entrar|va para|va pra|vá para|vá pra|va na|vá na|vai na|ir na)\b/;
const CLOSE_RE = /\b(fecha|fechar|feche|esconde|esconder|some|desliga|sai da|sair da|tira a|tira o|pode fechar)\b/;
const DATA_ASK_RE = /\b(quantos?|quanto|qnts|qtd|quantidade|cadastrad|saldo|vendeu|vendas|lucro|gastei|gasto|despesa|compromisso|agendad|horario|hoje tem|o que tem|quem comprou|mais vendeu)\b/;
const SCROLL_RE = /\b(rola|role|rolar|desce|descer|sobe|subir|scroll|topo da pagina|inicio da pagina|começo da pagina|comeco da pagina)\b/;

function matchPage(t) {
  for (const p of PAGES) {
    if (p.re.test(t)) return p;
  }
  return null;
}

export function detectDockNav(text) {
  const t = fold(text);
  if (!t) return null;
  const dataAsk = DATA_ASK_RE.test(t);
  const closing = CLOSE_RE.test(t);
  const opening = OPEN_RE.test(t);
  const words = t.split(/\s+/).filter(Boolean);
  const short = words.length <= 6;
  const page = matchPage(t);

  if (dataAsk && !closing && !opening) return null;
  if (SCROLL_RE.test(t) && !dataAsk) {
    const up = /\b(sobe|subir|topo|cima|inicio da pagina|começo|comeco)\b/.test(t);
    return {
      target: 'page',
      label: up ? 'topo da página' : 'página',
      action: 'scroll',
      dir: up ? 'up' : 'down',
    };
  }
  if (closing) {
    return {
      target: page?.target || 'calculator',
      label: page?.label || 'calculadora',
      action: 'close',
    };
  }
  if (page && (opening || (short && !dataAsk))) {
    return { target: page.target, label: page.label, action: 'open' };
  }
  return null;
}

export function emitDockControl(target, mode, extra = {}) {
  if (!target) return;
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('tc:dock-control', {
    detail: { target, mode: mode || 'open', ...extra },
  }));
}

export function scrollDockPage(dir) {
  if (typeof document === 'undefined') return;
  const want = String(dir || 'down');
  const nodes = Array.from(document.querySelectorAll('[data-dock-scroll]'));
  const el = nodes.find((n) => n.scrollHeight > n.clientHeight + 4) || nodes[0] || document.scrollingElement;
  if (!el) return;
  const step = Math.round((el.clientHeight || window.innerHeight || 600) * 0.72);
  if (want === 'up' || want === 'top') {
    el.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (want === 'bottom') {
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    return;
  }
  if (typeof el.scrollBy === 'function') el.scrollBy({ top: step, behavior: 'smooth' });
  else el.scrollTop = (el.scrollTop || 0) + step;
}
