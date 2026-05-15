import { Alert, Linking, Platform, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { getApiOrigin } from '../lib/subscription';
import { openWhatsApp, formatPhoneForWhatsApp } from './whatsapp';

export const CLIENT_REGISTRATION_PATH = '/cadastro-cliente';
export const CADASTRO_LINK_STORAGE_KEY = '@tudocerto_cadastro_link_url';

const DEFAULT_SITE = 'https://tudocerto-web.vercel.app';

export function getClientRegistrationBaseUrl() {
  return getApiOrigin() || DEFAULT_SITE;
}

/** URL pública (Vercel) para o cliente preencher o próprio cadastro. */
export function buildClientRegistrationUrl(ownerUserId) {
  const base = getClientRegistrationBaseUrl().replace(/\/$/, '');
  const path = CLIENT_REGISTRATION_PATH;
  if (!ownerUserId) return `${base}${path}`;
  return `${base}${path}?ref=${encodeURIComponent(String(ownerUserId))}`;
}

export function getClientRegistrationWhatsAppMessage(url) {
  return `Olá! Por favor preencha seu cadastro neste link: ${url}`;
}

export async function persistDefaultCadastroLinkUrl(ownerUserId) {
  if (!ownerUserId) return null;
  const url = buildClientRegistrationUrl(ownerUserId);
  try {
    await AsyncStorage.setItem(CADASTRO_LINK_STORAGE_KEY, `${getClientRegistrationBaseUrl().replace(/\/$/, '')}${CLIENT_REGISTRATION_PATH}`);
  } catch (_) {}
  return url;
}

export async function copyClientRegistrationLink(ownerUserId) {
  const url = buildClientRegistrationUrl(ownerUserId);
  try {
    await Clipboard.setStringAsync(url);
    Alert.alert('Link copiado', 'O link de cadastro foi copiado para a área de transferência.');
  } catch (_) {
    Alert.alert('Erro', 'Não foi possível copiar o link.');
  }
  return url;
}

/** Abre WhatsApp com texto (escolhe contato se não houver número). */
export function openWhatsAppShareText(text) {
  const msg = String(text || '').trim();
  if (!msg) return;
  const url = `https://wa.me/?text=${encodeURIComponent(msg).slice(0, 4000)}`;
  Linking.openURL(url).catch(() => Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.'));
}

/** Envia link de cadastro para um telefone ou abre seletor de contato. */
export function shareClientRegistrationViaWhatsApp(ownerUserId, phone) {
  const url = buildClientRegistrationUrl(ownerUserId);
  const message = getClientRegistrationWhatsAppMessage(url);
  const num = formatPhoneForWhatsApp(phone);
  if (num && num.length >= 10) {
    openWhatsApp(phone, message);
  } else {
    openWhatsAppShareText(message);
  }
}

export async function shareClientRegistrationLink(ownerUserId) {
  const url = buildClientRegistrationUrl(ownerUserId);
  const message = getClientRegistrationWhatsAppMessage(url);
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: 'Cadastro de cliente', text: message, url });
      return url;
    }
    await Share.share({ message, title: 'Link de cadastro' });
  } catch (_) {
    openWhatsAppShareText(message);
  }
  return url;
}
