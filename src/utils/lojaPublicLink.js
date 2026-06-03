import { Alert, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { getApiOrigin } from '../lib/subscription';
import { openWhatsAppShareText } from './clientRegistrationLink';

export const LOJA_PUBLIC_PATH = '/loja';
const DEFAULT_SITE = 'https://tudocerto-web.vercel.app';

export function getLojaPublicBaseUrl() {
  return getApiOrigin() || DEFAULT_SITE;
}

export function buildLojaPublicUrl(ownerUserId) {
  const base = getLojaPublicBaseUrl().replace(/\/$/, '');
  if (!ownerUserId) return `${base}${LOJA_PUBLIC_PATH}`;
  return `${base}${LOJA_PUBLIC_PATH}?ref=${encodeURIComponent(String(ownerUserId))}`;
}

export function getLojaPublicWhatsAppMessage(url, lojaNome) {
  const nome = lojaNome?.trim() || 'nossa loja';
  return `Olá! Conheça ${nome}, escolha produtos e serviços e agende online: ${url}`;
}

export async function copyLojaPublicLink(ownerUserId, lojaNome) {
  const url = buildLojaPublicUrl(ownerUserId);
  try {
    await Clipboard.setStringAsync(url);
    Alert.alert('Link copiado', 'O link da sua loja foi copiado. Compartilhe com seus clientes!');
  } catch (_) {
    Alert.alert('Erro', 'Não foi possível copiar o link.');
  }
  return url;
}

export async function shareLojaPublicLink(ownerUserId, lojaNome) {
  const url = buildLojaPublicUrl(ownerUserId);
  const message = getLojaPublicWhatsAppMessage(url, lojaNome);
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: lojaNome || 'Minha Loja', text: message, url });
      return url;
    }
    await Share.share({ message, title: 'Link da loja' });
  } catch (_) {
    openWhatsAppShareText(message);
  }
  return url;
}
