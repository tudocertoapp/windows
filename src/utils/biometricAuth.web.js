/**
 * Fallback web: biometria não disponível no navegador.
 * Retorna true para permitir visualização (sem bloqueio).
 */
export async function authenticateToRevealValues() {
  return true;
}
