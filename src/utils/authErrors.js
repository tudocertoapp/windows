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
      return 'E-mail ou senha incorretos. Tente de novo ou use «Entrar com Google».';
    }
    if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
      return 'Confirme o link que enviamos para seu e-mail antes de entrar. Verifique também a pasta de spam.';
    }
  }

  if (isSignUp) {
    if (msg.includes('already registered') || msg.includes('user already') || msg.includes('already been registered')) {
      return 'Este e-mail já está cadastrado. Use «Entrar» ou «Entrar com Google».';
    }
    if (
      raw.includes('AUTH_SIGNUP_SERVER') ||
      error?.status >= 500 ||
      msg.includes('internal server error') ||
      msg.includes('unexpected_failure')
    ) {
      return (
        'Não foi possível concluir o cadastro no servidor (erro 500).\n\n' +
        'No Supabase: Authentication → confirmação de e-mail e envio (SMTP ou e-mail padrão); em Logs do Auth veja o detalhe.\n\n' +
        'Se você usa trigger ao criar usuário: no projeto abra o ficheiro supabase-fix-auth-signup-trigger.sql e execute-o no SQL Editor (evita falha ao inserir em profiles).'
      );
    }
  }

  // Nunca expor URLs/tokens/erros crus ao usuário no fluxo de login.
  if (/https?:\/\/|supabase\.co|auth\/v1|anon|apikey|jwt/i.test(raw)) {
    return 'Não foi possível concluir agora. Tente novamente em instantes.';
  }
  return 'Não foi possível concluir. Tente de novo.';
}
