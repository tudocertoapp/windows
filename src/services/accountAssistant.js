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
  if (primary) list.push(primary);
  const site = String(getApiOrigin() || '').replace(/\/$/, '');
  if (site && !isLocalApi(site)) {
    const prodChat = `${site}/api/ai/chat`;
    if (!list.includes(prodChat)) list.push(prodChat);
  }
  return list;
}

export async function askAccountAssistant({ message, history = [], pendingAction = null, confirm = false, preferredName = '', voiceTone = 'neutra', memory = [] }) {
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
  for (let i = 0; i < endpoints.length; i += 1) {
    const endpoint = endpoints[i];
    try {
      const { data } = await axios.post(
        endpoint,
        { message, history, pendingAction, confirm: !!confirm, preferredName, voiceTone, task: 'assistant', memory: Array.isArray(memory) ? memory.slice(-48) : [] },
        {
          timeout: isLocalApi(endpoint) ? 18000 : 18000,
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
      const status = e?.response?.status;
      const code = e?.code;
      const localDead = !e?.response && (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || /Network Error/i.test(String(e?.message || '')));
      if (isLocalApi(endpoint) && !localDead) {
        break;
      }
      if (status === 401 || status === 403) break;
    }
  }
  return { ok: false, error: String(lastError) };
}
