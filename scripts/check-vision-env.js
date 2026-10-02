require('dotenv').config();

const gemini = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();
const site = (process.env.EXPO_PUBLIC_SITE_URL || '').trim();
const visionUrl = (process.env.EXPO_PUBLIC_VISION_API_URL || '').trim();

console.log('GEMINI_API_KEY (OCR de foto):', gemini ? `OK (${gemini.length} chars)` : 'AUSENTE');
console.log('EXPO_PUBLIC_SITE_URL:', site || 'AUSENTE');
console.log('EXPO_PUBLIC_VISION_API_URL:', visionUrl || 'AUSENTE (use http://localhost:3000 + npm run web:api no dev local)');
console.log('GROQ_API_KEY (chat Llama):', (process.env.GROQ_API_KEY || '').trim() ? 'OK' : 'AUSENTE');
console.log('AI_PROVIDER:', process.env.AI_PROVIDER || 'llama');

console.log('\nRESULTADO: OCR usa GEMINI_API_KEY no servidor. Chat: /api/ai/chat (dados do usuário autenticado).');
process.exit(0);
