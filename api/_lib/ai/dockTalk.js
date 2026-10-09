/** Dock: personalidade, abreviações e atalhos do app (sem gravar nada sozinho). */

function fold(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function withName(name, a, b) {
  return name ? a : b;
}

function extractCallName(text) {
  const t = String(text || '').trim();
  const m = t.match(/(?:me chama(?:r)?|me chame|pode me chamar|meu nome(?: e| é)?|te chamo)\s+(?:de\s+)?([A-Za-zÀ-ÿ]{2,20})\b/i);
  if (m?.[1] && !/^(voce|você|vc|dock|assistente|calculadora|agenda|produto|produtos)$/i.test(m[1])) return m[1];
  return '';
}

const PAGES = [
  { re: /\b(calculadora|calculador|calc)\b/, target: 'calculator', label: 'calculadora' },
  { re: /\b(inicio|home|dashboard|tela inicial|pagina inicial)\b/, target: 'home', label: 'início' },
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
  { re: /\b(qr ?code|qrcode dinamico|codigo qr)\b/, target: 'qrcode', label: 'QR Code dinâmico' },
  { re: /\b(scanner|comprovante|notinha)\b/, target: 'receipt', label: 'leitura de comprovante' },
  { re: /\b(imagem motivacional|gerador de imagem)\b/, target: 'image', label: 'imagem' },
  { re: /\b(profissional|profissionais)\b/, target: 'professionals', label: 'profissionais' },
  { re: /\b(boleto|faturas?)\b/, target: 'bills', label: 'boletos' },
  { re: /\bmenu\b/, target: 'menu', label: 'menu' },
  { re: /\btarefas?\b/, target: 'tasks', label: 'tarefas' },
];

function detectNav(text) {
  const t = fold(text);
  if (!t) return null;
  const writing = /\b(agende|agendar|agendamento|cadastre|cadastrar|cadastra|marca(?:r)?|sessao|cancela|cancelar|exclui|excluir|apaga)\b/.test(t);
  if (writing) return null;
  const dataAsk = /\b(quantos?|quanto|qnts|qtd|quantidade|cadastr|saldo|vendeu|vendas|lucro|gastei|gasto|despesa|compromisso|agend|horario|hoje tem|o que tem|quem comprou|mais vendeu|registre|lance)\b/.test(t);
  const closing = /\b(fecha|fechar|feche|fechando|esconde|esconder|some|desliga|sai da|sair da|tira a|tira o|pode fechar)\b/.test(t);
  const opening = /\b(abre|abra|abrir|mostra|mostre|mostrar|exibe|exibir|vai para|vai pra|ir para|ir pra|quero abrir|quero ver|quero ir|me leva|abre pra|abrir a tela|abrir tela|acesse|acessar|acessa|entra em|va para|va pra|va na|vai na)\b/.test(t);
  const exitDock = /\b((sair|sai|fecha|fechar|feche|encerrar|desliga)(?:\s+(?:o|do|da|a))?\s+(dock|palco)|sair dock|sai dock|fecha dock)\b/.test(t);
  const exitHome = /\b(sair da pagina|sai da pagina|sair da tela|sai da tela|sair dessa pagina|fecha a pagina|fechar a pagina|volta(?:r)?\s+(?:pro|pra|para o|para a|ao|a)\s+(inicio|home)|voltar para(?: o)? inicio)\b/.test(t);
  let page = null;
  for (const p of PAGES) {
    if (p.re.test(t)) {
      page = p;
      break;
    }
  }
  if (dataAsk && !closing && !opening) return null;
  if (/\b(rola|role|rolar|desce|descer|sobe|subir|topo da pagina|inicio da pagina)\b/.test(t) && !dataAsk) {
    const up = /\b(sobe|subir|topo|cima|inicio da pagina|comeco)\b/.test(t);
    return { target: 'page', label: 'página', action: 'scroll', dir: up ? 'up' : 'down' };
  }
  if (exitDock) return { target: 'dock', label: 'Dock', action: 'close' };
  if (exitHome || (closing && (!page || page.target === 'home'))) {
    return { target: 'home', label: 'início', action: 'open' };
  }
  if (closing) return { target: page.target, label: page.label, action: 'close' };
  const openingScreen = /\b(pagina|tela)\s+(de|do|da|dos|das)\s+/.test(t);
  if (page && (opening || openingScreen)) return { target: page.target, label: page.label, action: 'open' };
  return null;
}

function isHowAreYou(text) {
  const t = fold(text);
  if (/\b(como (voce|vc) (esta|ta)|tudo bem|td bem|blz|e voce|e vc|estou bem|to bem|tô bem)\b/.test(t)) return true;
  if (/^(tudo bem|td bem|blz|e ai|eae|beleza)[\s?]*$/.test(t)) return true;
  return false;
}

function wantsNameAsk(text) {
  const t = fold(text);
  return /\b(como me chama|qual (e|é) meu nome|esqueceu meu nome)\b/.test(t);
}

function isAffirmativeFollowUp(text) {
  const t = fold(text);
  if (!t) return false;
  if (/\b(nao|não|cancela|deixa|melhor nao)\b/.test(t) && !/\bsim\b/.test(t)) return false;
  return /\b(sim|s|ok|pode|claro|isso|esse|essa|aquele|aquela|detalh|mostra|mostrar|ver|quero|uhum|ss|vai|pode ser|o mes|esse mes|aquele mes|desse|dessa)\b/.test(t);
}

const MONTHS = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function monthNum(name) {
  const i = MONTHS.indexOf(fold(name));
  return i >= 0 ? i + 1 : 0;
}

function followUpFromAssistantText(content) {
  const t = fold(content);
  const names = MONTHS.join('|');
  const afterMove = t.match(new RegExp(`movimento foi\\s+(${names})\\s+de\\s+(20\\d{2})`));
  const all = [...t.matchAll(new RegExp(`\\b(${names})\\s+de\\s+(20\\d{2})\\b`, 'g'))];
  const m = afterMove || all[all.length - 1];
  if (!m) return null;
  const month = monthNum(m[1]);
  if (!month) return null;
  return {
    type: 'sales_month',
    options: [{ titulo: `${m[1]} de ${m[2]}`, key: `${m[2]}-${String(month).padStart(2, '0')}` }],
  };
}

module.exports = {
  fold,
  withName,
  extractCallName,
  detectNav,
  isHowAreYou,
  wantsNameAsk,
  isAffirmativeFollowUp,
  MONTHS,
  monthNum,
  followUpFromAssistantText,
};
