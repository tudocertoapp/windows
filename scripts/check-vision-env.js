require('dotenv').config();

const gemini = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();
const site = (process.env.EXPO_PUBLIC_SITE_URL || '').trim();
const visionUrl = (process.env.EXPO_PUBLIC_VISION_API_URL || '').trim();

console.log('GEMINI_API_KEY:', gemini ? `OK (${gemini.length} chars)` : 'AUSENTE');
console.log('EXPO_PUBLIC_SITE_URL:', site || 'AUSENTE');
console.log('EXPO_PUBLIC_VISION_API_URL:', visionUrl || 'AUSENTE (use http://localhost:3000 + npm run web:api no dev local)');

if (!gemini) {
  console.log('\nRESULTADO: configure GEMINI_API_KEY no .env e na Vercel.');
  process.exit(1);
}

console.log('\nRESULTADO: chave Gemini presente. A leitura de nota usa /api/vision/ocr.');
process.exit(0);
