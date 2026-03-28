/**
 * Mensagens claras para Supabase Auth (especialmente web / e-mail vs Google).
 */
export function formatAuthErrorMessage(error, { isSignUp = false } = {}) {
  const raw = String(error?.message || error || '').trim();
  const msg = raw.toLowerCase();

  if (!isSignUp) {
    if (
      msg.includes('invalid login credentials') ||
      msg.includes('invalid_credentials') ||
      (msg.includes('invalid') && msg.includes('credential'))
    ) {
      return 'E-mail ou senha incorretos.\n\nSe você entrou antes com Google, essa conta não usa senha neste formulário — use «Entrar com Google». Só depois de criar uma senha (por exemplo pelo link «Esqueci a senha») o login por e-mail funciona.';
    }
    if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
      return 'Confirme o link que enviamos para seu e-mail antes de entrar. Verifique também a pasta de spam.';
    }
  }

  if (isSignUp) {
    if (msg.includes('already registered') || msg.includes('user already') || msg.includes('already been registered')) {
      return 'Este e-mail já está cadastrado. Use «Entrar» ou «Entrar com Google».';
    }
  }

  return raw || 'Não foi possível concluir. Tente de novo.';
}
