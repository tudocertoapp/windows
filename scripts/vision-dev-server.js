/**
 * Servidor local para OCR + assistente nativo.
 * Uso: npm run web:api
 * No .env: EXPO_PUBLIC_VISION_API_URL=http://localhost:3000
 */
require('dotenv').config();
const http = require('http');
const handler = require('../api/vision/ocr');

const PORT = Number(process.env.VISION_DEV_PORT || 3000);

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const pathOnly = String(req.url || '').split('?')[0];
  const isOcr = pathOnly === '/api/vision/ocr';
  const isAiChat = pathOnly === '/api/ai/chat' || pathOnly === '/api/assistant/chat';
  if (!isOcr && !isAiChat) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Use GET ou POST /api/vision/ocr ou /api/ai/chat');
    return;
  }

  const raw = req.method === 'POST' ? await readBody(req) : '';
  let body = {};
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch (_) {
      body = {};
    }
  }
  if (isAiChat) {
    body = { ...(body && typeof body === 'object' ? body : {}), task: 'assistant' };
  }
  const mockReq = {
    method: req.method,
    headers: req.headers,
    url: isAiChat ? '/api/ai/chat' : req.url,
    body,
  };
  const mockRes = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      const payload = JSON.stringify(obj);
      res.writeHead(this.statusCode, {
        ...this.headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      });
      res.end(payload);
    },
    end() {
      res.writeHead(this.statusCode, this.headers);
      res.end();
    },
  };
  try {
    await handler(mockReq, mockRes);
  } catch (e) {
    const origin = req.headers.origin || '*';
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      Vary: 'Origin',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end(JSON.stringify({ error: e?.message || 'Erro interno' }));
  }
});

server.listen(PORT, () => {
  console.log(`[vision-dev] http://localhost:${PORT}/api/vision/ocr`);
  console.log(`[vision-dev] Assistente: http://localhost:${PORT}/api/ai/chat`);
  console.log('[vision-dev] No .env do app: EXPO_PUBLIC_VISION_API_URL=http://localhost:' + PORT);
});
