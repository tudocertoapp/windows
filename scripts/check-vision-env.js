require('dotenv').config();

const key = (process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY || process.env.GOOGLE_VISION_API_KEY || '').trim();
const site = (process.env.EXPO_PUBLIC_SITE_URL || '').trim();
const visionUrl = (process.env.EXPO_PUBLIC_VISION_API_URL || '').trim();
const stripeUrl = (process.env.EXPO_PUBLIC_STRIPE_API_URL || '').trim();

console.log('EXPO_PUBLIC_GOOGLE_VISION_API_KEY:', key ? `OK (${key.length} chars)` : 'AUSENTE');
console.log('EXPO_PUBLIC_SITE_URL:', site || 'AUSENTE');
console.log('EXPO_PUBLIC_VISION_API_URL:', visionUrl || 'AUSENTE (use http://localhost:3000 + npm run web:api no dev local)');
console.log('Proxy OCR em produção:', site || stripeUrl || 'depende do deploy Vercel');

if (!key) {
  console.log('\nRESULTADO: OCR não funcionará até configurar a chave.');
  process.exit(1);
}

// Teste mínimo na API Google (imagem 1x1 branca)
const tinyPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function testDirect() {
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ image: { content: tinyPngBase64 }, features: [{ type: 'TEXT_DETECTION' }] }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.log('\nTESTE DIRETO GOOGLE VISION: FALHOU');
    console.log('HTTP', res.status, data?.error?.message || res.statusText);
    return false;
  }
  console.log('\nTESTE DIRETO GOOGLE VISION: OK (chave válida e API ativa)');
  return true;
}

testDirect()
  .then((ok) => process.exit(ok ? 0 : 2))
  .catch((e) => {
    console.log('\nTESTE DIRETO GOOGLE VISION: ERRO DE REDE', e.message);
    process.exit(3);
  });
