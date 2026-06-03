require('dotenv').config();

const key = String(process.env.STRIPE_SECRET_KEY || '').trim();
const webhook = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
const apiUrl = String(process.env.EXPO_PUBLIC_STRIPE_API_URL || process.env.EXPO_PUBLIC_SITE_URL || '').trim();

console.log('EXPO_PUBLIC_STRIPE_API_URL:', apiUrl || 'AUSENTE');
console.log('STRIPE_SECRET_KEY (local .env):', !key ? 'VAZIA' : key.startsWith('rk_') ? 'INVÁLIDA (rk_ Restricted — use sk_)' : key.startsWith('pk_') ? 'INVÁLIDA (pk_ é Publishable, use sk_)' : key.startsWith('sk_') ? `OK (${key.slice(0, 7)}…)` : 'FORMATO INVÁLIDO');
if (!key && webhook && (webhook.startsWith('rk_') || webhook.startsWith('sk_') || webhook.startsWith('pk_'))) {
  console.log('ERRO: você colocou a chave de API em STRIPE_WEBHOOK_SECRET. Mova para STRIPE_SECRET_KEY (só se for sk_*).');
}
console.log('STRIPE_WEBHOOK_SECRET:', webhook ? (webhook.startsWith('whsec_') ? 'OK' : webhook.startsWith('rk_') ? 'INVÁLIDA (rk_ não é webhook — use whsec_)' : 'formato inválido (use whsec_)') : 'VAZIA (ok em dev sem webhook)');

if (!key) {
  console.log('\nCheckout no PC chama a API em', apiUrl || '(não definida)');
  console.log('→ Configure STRIPE_SECRET_KEY=sk_test_... no .env (dev local) OU na Vercel (produção).');
  console.log('→ O erro rk_ vem da Vercel se lá estiver Restricted key em vez de Secret key.');
  process.exit(1);
}
if (key.startsWith('rk_')) {
  console.log('\nSubstitua por Secret key: Stripe Dashboard → Developers → API keys → Reveal sk_test_ ou sk_live_');
  process.exit(2);
}
if (!key.startsWith('sk_')) {
  console.log('\nSTRIPE_SECRET_KEY deve começar com sk_test_ ou sk_live_.');
  process.exit(3);
}
console.log('\nStripe local: OK');
process.exit(0);
