import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useFinance } from '../contexts/FinanceContext';
import { googleVisionOcrText } from '../services/googleVisionOCR';
import { parseReceipt } from '../utils/parseReceipt';

function brDateToIso(dateStr) {
  if (!dateStr) return null;
  const parts = String(dateStr).trim().split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy) return null;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

export function ReceiptScannerScreen({ onClose, isModal }) {
  const { colors } = useTheme();
  const { addTransaction } = useFinance();

  const [image, setImage] = useState(null); // { uri, base64 }
  const [scanning, setScanning] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [parsed, setParsed] = useState(null); // {store,value,date,rawText}

  const suggestedExpense = useMemo(() => {
    if (!parsed?.value) return null;
    const store = parsed.store || 'Comprovante';
    const iso = brDateToIso(parsed.date) || new Date().toISOString().slice(0, 10);
    return {
      type: 'expense',
      category: 'Outros',
      description: store,
      amount: parsed.value,
      date: iso,
    };
  }, [parsed]);

  const scan = async (picked) => {
    if (!picked?.uri) return;
    setImage(picked);
    setScanning(true);
    setOcrText('');
    setParsed(null);
    try {
      const text = await googleVisionOcrText(picked, { languageHints: ['pt'] });
      setOcrText(text);
      setParsed(parseReceipt(text));
    } catch (e) {
      Alert.alert('Erro no OCR', e?.message || 'Não consegui ler esse comprovante.');
    } finally {
      setScanning(false);
    }
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão', 'Permita acesso às fotos para selecionar um comprovante.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      base64: true,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const a = result.assets[0];
    await scan({ uri: a.uri, base64: a.base64 });
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão', 'Permita acesso à câmera para tirar foto do comprovante.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
      base64: true,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const a = result.assets[0];
    await scan({ uri: a.uri, base64: a.base64 });
  };

  const addToMeusGastos = async () => {
    if (!suggestedExpense) {
      Alert.alert('Atenção', 'Não encontrei um valor confiável. Tente outra foto mais nítida.');
      return;
    }
    try {
      await addTransaction(suggestedExpense);
      Alert.alert('Pronto', 'Despesa adicionada ao Meus Gastos.');
      onClose?.();
    } catch (e) {
      Alert.alert('Erro', 'Não consegui salvar a despesa. Tente novamente.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.text }]}>Scanner de comprovante</Text>
        {isModal && (
          <TouchableOpacity onPress={onClose} style={[s.headerBtn, { backgroundColor: colors.primaryRgba(0.2) }]}>
            <Ionicons name="close" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ padding: 16, gap: 10 }}>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 10 }}>
            Escaneie uma notinha para preencher o Meus Gastos automaticamente.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={takePhoto} style={[s.btn, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={s.btnText}>Scan receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickFromGallery} style={[s.btn, { backgroundColor: colors.primaryRgba(0.15), borderColor: colors.primary + '60', borderWidth: 1 }]}>
              <Ionicons name="image" size={18} color={colors.primary} />
              <Text style={[s.btnText, { color: colors.primary }]}>Galeria</Text>
            </TouchableOpacity>
          </View>
        </View>

        {image?.uri ? (
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>Preview</Text>
            <Image source={{ uri: image.uri }} style={{ width: '100%', height: 220, borderRadius: 12, backgroundColor: colors.bg }} resizeMode="contain" />
          </View>
        ) : null}

        {scanning ? (
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>Lendo comprovante…</Text>
          </View>
        ) : null}

        {parsed ? (
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 10 }}>Dados extraídos</Text>
            <View style={s.row}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Loja</Text>
              <Text style={[s.value, { color: colors.text }]} numberOfLines={1}>{parsed.store || '-'}</Text>
            </View>
            <View style={s.row}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Data</Text>
              <Text style={[s.value, { color: colors.text }]}>{parsed.date || '-'}</Text>
            </View>
            <View style={s.row}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Valor</Text>
              <Text style={[s.value, { color: colors.text }]}>{parsed.value != null ? `R$ ${parsed.value.toFixed(2).replace('.', ',')}` : '-'}</Text>
            </View>

            <TouchableOpacity
              onPress={addToMeusGastos}
              style={[s.btnFull, { backgroundColor: suggestedExpense ? colors.primary : colors.border }]}
              disabled={!suggestedExpense}
            >
              <Ionicons name="add-circle-outline" size={20} color={suggestedExpense ? '#fff' : colors.textSecondary} />
              <Text style={{ color: suggestedExpense ? '#fff' : colors.textSecondary, fontWeight: '800' }}>Adicionar ao Meus Gastos</Text>
            </TouchableOpacity>

            {!suggestedExpense ? (
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>
                Dica: tente aproximar a câmera do “TOTAL” e manter a nota bem reta e iluminada.
              </Text>
            ) : null}
          </View>
        ) : null}

        {!!ocrText && !scanning ? (
          <View style={[s.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>Texto OCR (debug)</Text>
            <Text style={{ color: colors.text, fontSize: 12, lineHeight: 18 }} numberOfLines={10}>{ocrText}</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: 14, padding: 14 },
  btn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  btnText: { color: '#fff', fontWeight: '800' },
  btnFull: { marginTop: 14, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 6 },
  label: { fontSize: 12, fontWeight: '700' },
  value: { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
});

