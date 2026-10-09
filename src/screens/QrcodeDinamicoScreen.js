import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { TopBar } from '../components/TopBar';
import { playTapSound } from '../utils/sounds';
import {
  createDynamicQr,
  deleteDynamicQr,
  downloadQrPng,
  getQrScanUrl,
  listDynamicQrs,
  qrImageUrl,
  updateDynamicQr,
} from '../utils/dynamicQr';

export function QrcodeDinamicoScreen({ onClose, isModal }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = user?.id || null;
  const [link, setLink] = useState('');
  const [label, setLabel] = useState('');
  const [rows, setRows] = useState([]);
  const [remote, setRemote] = useState(true);
  const [busy, setBusy] = useState(false);
  const [edits, setEdits] = useState({});

  const load = useCallback(async () => {
    const out = await listDynamicQrs(userId);
    setRows(out.rows || []);
    setRemote(!!out.remote);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const notify = (title, msg) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
      window.alert(msg || title);
      return;
    }
    Alert.alert(title, msg);
  };

  const onGenerate = async () => {
    playTapSound();
    setBusy(true);
    const out = await createDynamicQr(userId, { targetUrl: link, label });
    setBusy(false);
    if (!out.ok) {
      notify('QR Code', out.error);
      return;
    }
    setLink('');
    setLabel('');
    await load();
    if (!out.remote) {
      notify(
        'QR gerado neste aparelho',
        'Para o celular de outra pessoa abrir o destino, execute o SQL supabase-dynamic-qrcodes.sql no Supabase.',
      );
    }
  };

  const onSaveDestino = async (row) => {
    playTapSound();
    const next = edits[row.id] != null ? edits[row.id] : row.targetUrl;
    const out = await updateDynamicQr(userId, row.id, { targetUrl: next });
    if (!out.ok) {
      notify('Destino', out.error);
      return;
    }
    await load();
    notify('Pronto', `O QR ${row.code} agora aponta para o novo link. A imagem impressa não muda.`);
  };

  const onSaveImage = async (row) => {
    playTapSound();
    const out = await downloadQrPng(getQrScanUrl(row.code), row.code);
    if (!out.ok) notify('Imagem', out.error);
  };

  const onCopy = async (text) => {
    playTapSound();
    await Clipboard.setStringAsync(text);
    notify('Copiado', 'Link copiado.');
  };

  const onDelete = async (row) => {
    playTapSound();
    const ok = Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.confirm(`Excluir o QR ${row.code}? A imagem antiga deixa de funcionar.`)
      : true;
    if (!ok) return;
    if (Platform.OS !== 'web') {
      Alert.alert('Excluir', `Excluir o QR ${row.code}?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: async () => { await deleteDynamicQr(userId, row.id); load(); } },
      ]);
      return;
    }
    await deleteDynamicQr(userId, row.id);
    load();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {isModal && onClose ? (
        <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>QR Code dinâmico</Text>
          <TouchableOpacity onPress={onClose} style={s.close} accessibilityLabel="Fechar">
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TopBar title="QR Code dinâmico" colors={colors} />
      )}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={[s.hero, { backgroundColor: colors.primary }]}>
          <Text style={s.heroKicker}>O QR NÃO MUDA. O DESTINO MUDA.</Text>
          <Text style={s.heroTitle}>Um código, vários destinos ao longo do tempo</Text>
          <Text style={s.heroText}>
            Você imprime ou salva a imagem uma vez. Por trás, o QR aponta para um endereço nosso com um número de 4 dígitos.
            Quando quiser, só cola outro link aqui. Quem já tiver o QR impresso cai no site novo, sem gerar outra imagem.
          </Text>
        </View>

        <View style={s.steps}>
          {[
            { n: '1', t: 'Cole o link', d: 'WhatsApp, Instagram, site, cardápio, formulário…' },
            { n: '2', t: 'Gere o QR', d: 'O app cria o número 0001, 0002… e a imagem para salvar.' },
            { n: '3', t: 'Troque o destino quando quiser', d: 'Edite o link na lista. A imagem continua a mesma.' },
          ].map((item) => (
            <View key={item.n} style={[s.step, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.stepN, { color: colors.primary }]}>{item.n}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.stepT, { color: colors.text }]}>{item.t}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>{item.d}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>Novo QR Code</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
            Cole abaixo o endereço para onde a pessoa deve ir ao apontar a câmera.
          </Text>
          <Text style={[s.label, { color: colors.textSecondary }]}>LINK DE DESTINO</Text>
          <TextInput
            value={link}
            onChangeText={setLink}
            placeholder="https://seu-site.com ou https://wa.me/55…"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
          />
          <Text style={[s.label, { color: colors.textSecondary, marginTop: 12 }]}>NOME (OPCIONAL)</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Ex.: Cardápio da loja, Instagram, Pix"
            placeholderTextColor={colors.textSecondary}
            style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
          />
          <TouchableOpacity
            onPress={onGenerate}
            disabled={busy}
            style={[s.btn, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
          >
            <Ionicons name="qr-code-outline" size={22} color="#fff" />
            <Text style={s.btnText}>{busy ? 'Gerando…' : 'Gerar QR Code dinâmico'}</Text>
          </TouchableOpacity>
        </View>

        {!remote ? (
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginHorizontal: 16, marginBottom: 8 }}>
            Destinos desta sessão estão neste aparelho. Para o QR funcionar em qualquer celular, rode supabase-dynamic-qrcodes.sql no Supabase.
          </Text>
        ) : null}

        {rows.map((row) => {
          const scan = getQrScanUrl(row.code);
          const draft = edits[row.id] != null ? edits[row.id] : row.targetUrl;
          return (
            <View key={row.id} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.rowHead}>
                <View>
                  <Text style={[s.codeLabel, { color: colors.textSecondary }]}>NÚMERO DO QR</Text>
                  <Text style={[s.code, { color: colors.primary }]}>{row.code}</Text>
                  {row.label ? <Text style={{ color: colors.text, fontWeight: '600', marginTop: 2 }}>{row.label}</Text> : null}
                </View>
                <Image source={{ uri: qrImageUrl(scan) }} style={s.qr} />
              </View>
              <Text style={[s.label, { color: colors.textSecondary }]}>ESTE QR SEMPRE ABRE ESTE ENDEREÇO INTERNO</Text>
              <Text style={{ color: colors.text, fontSize: 12, marginBottom: 10 }} selectable>{scan}</Text>
              <Text style={[s.label, { color: colors.textSecondary }]}>DESTINO ATUAL (PODE TROCAR)</Text>
              <TextInput
                value={draft}
                onChangeText={(v) => setEdits((prev) => ({ ...prev, [row.id]: v }))}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
              />
              <View style={s.actions}>
                <TouchableOpacity style={[s.mini, { borderColor: colors.primary }]} onPress={() => onSaveDestino(row)}>
                  <Ionicons name="save-outline" size={18} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>Salvar destino</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.mini, { borderColor: colors.border }]} onPress={() => onSaveImage(row)}>
                  <Ionicons name="download-outline" size={18} color={colors.text} />
                  <Text style={{ color: colors.text, fontWeight: '700' }}>Salvar imagem</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.mini, { borderColor: colors.border }]} onPress={() => onCopy(scan)}>
                  <Ionicons name="copy-outline" size={18} color={colors.text} />
                  <Text style={{ color: colors.text, fontWeight: '700' }}>Copiar QR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.mini, { borderColor: colors.border }]} onPress={() => onDelete(row)}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontWeight: '700' }}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  hero: { margin: 16, padding: 20, borderRadius: 20 },
  heroKicker: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  heroText: { color: 'rgba(255,255,255,0.92)', fontSize: 14, lineHeight: 20 },
  steps: { paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  step: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  stepN: { fontSize: 22, fontWeight: '800', width: 28 },
  stepT: { fontSize: 15, fontWeight: '700' },
  card: { marginHorizontal: 16, marginTop: 12, padding: 18, borderRadius: 18, borderWidth: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14 },
  btn: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 },
  codeLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },
  code: { fontSize: 36, fontWeight: '800', letterSpacing: 2 },
  qr: { width: 112, height: 112, borderRadius: 12, backgroundColor: '#fff' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  mini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
