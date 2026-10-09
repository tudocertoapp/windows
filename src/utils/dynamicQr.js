import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { getLojaPublicBaseUrl } from './lojaPublicLink';

const LOCAL_KEY = (uid) => `@tudocerto_dynamic_qr_${uid || 'guest'}`;

export function padQrCode(n) {
  const s = String(n || '').replace(/\D/g, '');
  return s.padStart(4, '0').slice(-4);
}

export function normalizeTargetUrl(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!u.hostname) return '';
    return u.toString();
  } catch (_) {
    return '';
  }
}

export function getQrScanUrl(code) {
  const base = getLojaPublicBaseUrl().replace(/\/$/, '');
  return `${base}/q/${padQrCode(code)}`;
}

export function qrImageUrl(scanUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=512x512&margin=10&ecc=M&data=${encodeURIComponent(scanUrl)}`;
}

export function getPublicQrCodeFromPath(pathname) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    const p = String(pathname || '');
    const m = p.match(/\/q\/(\d{4})\/?$/);
    return m ? m[1] : null;
  }
  const path = String(pathname || window.location.pathname || '').replace(/\/$/, '') || '/';
  const m = path.match(/^\/q\/(\d{4})$/);
  return m ? m[1] : null;
}

async function readLocal(userId) {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY(userId));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (_) {
    return [];
  }
}

async function writeLocal(userId, list) {
  await AsyncStorage.setItem(LOCAL_KEY(userId), JSON.stringify(list)).catch(() => {});
}

async function nextCode(existing) {
  const used = new Set((existing || []).map((row) => padQrCode(row.code)));
  for (let i = 1; i <= 9999; i += 1) {
    const code = padQrCode(i);
    if (used.has(code)) continue;
    const { data, error } = await supabase.from('dynamic_qrcodes').select('code').eq('code', code).maybeSingle();
    if (error || !data) return code;
    used.add(code);
  }
  return null;
}

export async function listDynamicQrs(userId) {
  if (userId) {
    const { data, error } = await supabase
      .from('dynamic_qrcodes')
      .select('id,code,target_url,label,created_at,updated_at')
      .eq('user_id', userId)
      .order('code', { ascending: true });
    if (!error && Array.isArray(data)) {
      const rows = data.map((r) => ({
        id: r.id,
        code: padQrCode(r.code),
        targetUrl: r.target_url,
        label: r.label || '',
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      await writeLocal(userId, rows);
      return { ok: true, rows, remote: true };
    }
  }
  const rows = await readLocal(userId);
  return { ok: true, rows, remote: false };
}

export async function createDynamicQr(userId, { targetUrl, label }) {
  const url = normalizeTargetUrl(targetUrl);
  if (!url) return { ok: false, error: 'Cole um link válido, começando com https://' };
  const current = await listDynamicQrs(userId);
  const code = await nextCode(current.rows);
  if (!code) return { ok: false, error: 'Todos os números de 4 dígitos desta conta já foram usados.' };
  const row = {
    id: `local-${Date.now()}`,
    code,
    targetUrl: url,
    label: String(label || '').trim().slice(0, 80),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (userId) {
    const { data, error } = await supabase
      .from('dynamic_qrcodes')
      .insert({
        user_id: userId,
        code,
        target_url: url,
        label: row.label || null,
      })
      .select('id,code,target_url,label,created_at,updated_at')
      .maybeSingle();
    if (!error && data?.id) {
      return {
        ok: true,
        remote: true,
        row: {
          id: data.id,
          code: padQrCode(data.code),
          targetUrl: data.target_url,
          label: data.label || '',
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      };
    }
    if (error && /duplicate|unique/i.test(String(error.message || ''))) {
      return { ok: false, error: 'Esse número já existe. Tente gerar de novo.' };
    }
  }
  const rows = [...current.rows, row];
  await writeLocal(userId, rows);
  return { ok: true, remote: false, row };
}

export async function updateDynamicQr(userId, id, { targetUrl, label }) {
  const url = targetUrl != null ? normalizeTargetUrl(targetUrl) : null;
  if (targetUrl != null && !url) return { ok: false, error: 'Cole um link válido.' };
  const patch = { updatedAt: new Date().toISOString() };
  if (url) patch.targetUrl = url;
  if (label != null) patch.label = String(label || '').trim().slice(0, 80);
  if (userId && id && !String(id).startsWith('local-')) {
    const dbPatch = { updated_at: new Date().toISOString() };
    if (url) dbPatch.target_url = url;
    if (label != null) dbPatch.label = patch.label || null;
    const { error } = await supabase.from('dynamic_qrcodes').update(dbPatch).eq('id', id).eq('user_id', userId);
    if (error) return { ok: false, error: error.message || 'Não foi possível salvar o novo destino.' };
  }
  const current = await listDynamicQrs(userId);
  const rows = current.rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
  await writeLocal(userId, rows);
  return { ok: true };
}

export async function deleteDynamicQr(userId, id) {
  if (userId && id && !String(id).startsWith('local-')) {
    await supabase.from('dynamic_qrcodes').delete().eq('id', id).eq('user_id', userId);
  }
  const current = await listDynamicQrs(userId);
  await writeLocal(userId, current.rows.filter((r) => r.id !== id));
  return { ok: true };
}

export async function lookupDynamicQrTarget(code) {
  const padded = padQrCode(code);
  const { data, error } = await supabase
    .from('dynamic_qrcodes')
    .select('target_url')
    .eq('code', padded)
    .maybeSingle();
  if (!error && data?.target_url) return { ok: true, url: data.target_url };
  return { ok: false, error: 'QR não encontrado.' };
}

export async function downloadQrPng(scanUrl, code) {
  const name = `qrcode-${padQrCode(code)}.png`;
  const src = qrImageUrl(scanUrl);
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const res = await fetch(src);
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1500);
    return { ok: true };
  }
  return { ok: false, error: 'Salve a imagem pelo navegador nesta versão.' };
}
