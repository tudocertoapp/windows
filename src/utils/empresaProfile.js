/** Campos de endereço/contato da empresa no perfil (Supabase profiles). */
export const EMPRESA_ENDERECO_FIELDS = [
  'endereco_rua',
  'endereco_numero',
  'endereco_complemento',
  'endereco_bairro',
  'endereco_cidade',
  'endereco_estado',
  'endereco_cep',
  'instagram',
];

export const EMPTY_EMPRESA_ENDERECO = {
  endereco_rua: '',
  endereco_numero: '',
  endereco_complemento: '',
  endereco_bairro: '',
  endereco_cidade: '',
  endereco_estado: '',
  endereco_cep: '',
  instagram: '',
};

/** Monta endereço completo a partir dos campos ou do legado `endereco`. */
export function buildEnderecoCompleto(profile) {
  if (!profile) return '';
  const rua = String(profile.endereco_rua || '').trim();
  const num = String(profile.endereco_numero || '').trim();
  const parts = [];
  if (rua) parts.push(num ? `${rua}, ${num}` : rua);
  const comp = String(profile.endereco_complemento || '').trim();
  if (comp) parts.push(comp);
  const bairro = String(profile.endereco_bairro || '').trim();
  if (bairro) parts.push(bairro);
  const cidade = String(profile.endereco_cidade || '').trim();
  const uf = String(profile.endereco_estado || '').trim();
  if (cidade && uf) parts.push(`${cidade} - ${uf.toUpperCase()}`);
  else if (cidade) parts.push(cidade);
  const cep = String(profile.endereco_cep || '').trim();
  if (cep) parts.push(`CEP ${cep}`);
  if (parts.length) return parts.join(' · ');
  return String(profile.endereco || profile.address || '').trim();
}

/** Objeto padronizado para cupons, comprovantes e relatórios. */
export function buildEmpresaInfo(profile) {
  const endereco = buildEnderecoCompleto(profile);
  return {
    empresa: profile?.empresa || profile?.nome || '',
    nome: profile?.nome || '',
    cnpj: profile?.cnpj || profile?.cpf || '',
    endereco,
    telefone: profile?.telefone || profile?.phone || '',
    email: profile?.email || '',
    instagram: profile?.instagram || '',
    profissao: profile?.profissao || '',
    endereco_rua: profile?.endereco_rua || '',
    endereco_numero: profile?.endereco_numero || '',
    endereco_complemento: profile?.endereco_complemento || '',
    endereco_bairro: profile?.endereco_bairro || '',
    endereco_cidade: profile?.endereco_cidade || '',
    endereco_estado: profile?.endereco_estado || '',
    endereco_cep: profile?.endereco_cep || '',
  };
}

/** Linhas de cabeçalho para cupom térmico / texto. */
export function buildEmpresaDocumentLines(profile) {
  const info = buildEmpresaInfo(profile);
  const lines = [];
  if (info.empresa) lines.push(info.empresa);
  if (info.cnpj) lines.push(`CNPJ: ${info.cnpj}`);
  if (info.endereco) lines.push(info.endereco);
  if (info.telefone) lines.push(`Tel: ${info.telefone}`);
  if (info.instagram) lines.push(`Instagram: ${info.instagram}`);
  if (info.email) lines.push(info.email);
  return lines;
}

export function buildEmpresaDocumentHtml(profile) {
  const esc = (s) => String(s || '').replace(/</g, '&lt;');
  return buildEmpresaDocumentLines(profile).map((line) => `<p style="margin:2px 0">${esc(line)}</p>`).join('');
}

export function pickEmpresaEnderecoFromProfile(profile) {
  return {
    ...EMPTY_EMPRESA_ENDERECO,
    endereco_rua: profile?.endereco_rua || '',
    endereco_numero: profile?.endereco_numero || '',
    endereco_complemento: profile?.endereco_complemento || '',
    endereco_bairro: profile?.endereco_bairro || '',
    endereco_cidade: profile?.endereco_cidade || '',
    endereco_estado: profile?.endereco_estado || '',
    endereco_cep: profile?.endereco_cep || '',
    instagram: profile?.instagram || '',
  };
}
