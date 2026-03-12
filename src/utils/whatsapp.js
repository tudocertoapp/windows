import { Linking, Alert, InteractionManager } from 'react-native';

export function formatPhoneForWhatsApp(phone) {
  if (!phone) return '';
  let p = String(phone).replace(/\D/g, '');
  if (p.startsWith('0')) p = p.slice(1);
  if (p.length === 11 && p.startsWith('1')) p = '55' + p;
  else if (p.length === 10) p = '55' + p;
  return p;
}

export function openWhatsApp(phone, text = '') {
  const num = formatPhoneForWhatsApp(phone);
  if (!num || num.length < 10) {
    Alert.alert('Erro', 'Número de telefone inválido.');
    return;
  }
  try {
    const encoded = text ? encodeURIComponent(text).slice(0, 4000) : '';
    const url = `https://wa.me/${num}${encoded ? '?text=' + encoded : ''}`;
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        Linking.openURL(url).catch(() => Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.'));
      }, 200);
    });
  } catch (e) {
    Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
  }
}
