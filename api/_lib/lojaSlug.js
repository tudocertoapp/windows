const RESERVED = new Set([
  'api', 'loja', 'inicio', 'dinheiro', 'agenda', 'whatsapp', 'meus-gastos',
  'clientes', 'produtos', 'servicos', 'tarefas', 'boletos', 'fornecedores',
  'cadastro', 'cadastro-cliente', 'sucesso', 'cancelado', 'login', 'catalogo',
  'admin', 'app', 'www', 'static', 'assets', 'index', 'home',
  'menu', 'pdv', 'orcamentos', 'orcamento', 'ordem-servico', 'empresa',
  'colaboradores', 'aniversariantes', 'metas', 'lista-compras', 'scanner',
  'calculadora', 'calculadora-flutuante', 'adicionar', 'acoes', 'imagem',
  'assistente', 'indique', 'assinatura', 'perfil', 'cadastros', 'produto',
  'bancos', 'termos', 'privacidade', 'temas', 'anotacoes', 'a-receber',
  'favicon', 'robots', 'sitemap',
]);

function normalizeLojaSlug(raw) {
  let s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/^https?:\/\//, '');
  s = s.replace(/^[^/]*tudocerto-web\.vercel\.app/i, '');
  s = s.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '');
  const parts = s.split('/').filter(Boolean);
  if (parts[0] === 'loja') s = parts[1] || '';
  else s = parts[0] || '';
  s = s.replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (s.length < 3 || s.length > 40) return '';
  if (RESERVED.has(s)) return '';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return '';
  return s;
}

module.exports = { normalizeLojaSlug, RESERVED };
