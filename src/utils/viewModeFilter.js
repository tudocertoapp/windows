/** Filtra transações/bancos pelo modo Pessoal/Empresa (inclui vendas PDV legadas com tipo "avista"). */
export function transactionMatchesViewMode(tx, viewMode) {
  const tipo = tx?.tipoVenda || 'pessoal';
  if (tipo === viewMode) return true;
  if (viewMode === 'empresa' && tipo === 'avista') return true;
  return false;
}
