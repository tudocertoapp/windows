import axios from 'axios';
import { supabase } from '../lib/supabase';
import { getAssistantChatEndpoint } from '../lib/assistantApi';
import { getApiOrigin } from '../lib/subscription';

function isLocalApi(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?/i.test(String(url || ''));
}

function assistantEndpoints() {
  const list = [];
  const primary = getAssistantChatEndpoint();
  if (primary) {
    list.push(primary);
    const ocr = primary.replace(/\/api\/ai\/chat\/?$/i, '/api/vision/ocr');
    if (ocr && ocr !== primary && !list.includes(ocr)) list.push(ocr);
  }
  // Em localhost não cair na Vercel: /api/ai/chat ainda não existe no deploy e o browser mostra "Network Error".
  if (primary && isLocalApi(primary)) return list;
  const site = String(getApiOrigin() || '').replace(/\/$/, '');
  if (site && !isLocalApi(site)) {
    const prodChat = `${site}/api/ai/chat`;
    const prodOcr = `${site}/api/vision/ocr`;
    if (!list.includes(prodChat)) list.push(prodChat);
    if (!list.includes(prodOcr)) list.push(prodOcr);
  }
  return list;
}

export async function askAccountAssistant({ message, history = [], pendingAction = null, confirm = false, preferredName = '' }) {
  const endpoints = assistantEndpoints();
  if (!endpoints.length) {
    return { ok: false, error: 'Servidor do assistente não configurado. Rode npm run web:dev ou faça deploy na Vercel.' };
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    return { ok: false, error: 'Faça login para eu ler os dados da sua conta.' };
  }
  let lastError = 'Não consegui responder agora.';
  for (const endpoint of endpoints) {
    try {
      const { data } = await axios.post(
        endpoint,
        { message, history, pendingAction, confirm: !!confirm, preferredName, task: 'assistant' },
        {
          timeout: 28000,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const reply = String(data?.message || data?.reply || '').trim();
      if (!reply) {
        lastError = 'Não consegui montar a resposta. Tente de novo.';
        continue;
      }
      return {
        ok: true,
        reply,
        intent: data?.intent || 'unknown',
        cards: Array.isArray(data?.cards) ? data.cards : [],
        pendingAction: data?.pendingAction || null,
        followUp: data?.followUp || null,
        uiAction: data?.uiAction || null,
        callName: data?.callName || null,
      };
    } catch (e) {
      lastError = e?.response?.data?.error || e?.message || lastError;
    }
  }
  return { ok: false, error: String(lastError) };
}
