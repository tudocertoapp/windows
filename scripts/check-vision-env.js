require('dotenv').config();

const gemini = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();
const groq = (process.env.GROQ_API_KEY || '').trim();
const site = (process.env.EXPO_PUBLIC_SITE_URL || '').trim();
const visionUrl = (process.env.EXPO_PUBLIC_VISION_API_URL || '').trim();

console.log('GEMINI_API_KEY:', gemini ? `OK (${gemini.length} chars)` : 'AUSENTE');
console.log('GROQ_API_KEY:', groq ? `OK (${groq.length} chars)` : 'AUSENTE (assistente Llama)');
console.log('EXPO_PUBLIC_SITE_URL:', site || 'AUSENTE');
console.log('EXPO_PUBLIC_VISION_API_URL:', visionUrl || 'AUSENTE (use http://localhost:3000 + npm run web:api no dev local)');

if (!gemini && !groq) {
  console.log('\nRESULTADO: configure GEMINI_API_KEY (OCR) e/ou GROQ_API_KEY (assistente) no .env e na Vercel.');
  process.exit(1);
}

console.log('\nRESULTADO: chaves locais presentes. OCR: /api/vision/ocr · Assistente: /api/assistant/chat');
process.exit(0);
