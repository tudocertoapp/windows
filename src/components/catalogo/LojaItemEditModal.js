import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { MoneyInput } from '../MoneyInput';
import { uploadClientPhoto } from '../../utils/uploadClientPhoto';
import { readImageAsBase64 } from '../../utils/readImageAsBase64';
import { playTapSound } from '../../utils/sounds';

export function LojaItemEditModal({ visible, item, onSave, onClose, userId, saving }) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  const isServico = item?._tipo === 'servico';

  useEffect(() => {
    if (!visible || !item) return;
    setName(item.name || '');
    setPrice(item.price != null ? String(item.price).replace('.', ',') : '');
    setDiscount(item.discount != null ? String(item.discount).replace('.', ',') : '');
    setPhotoUri(item.photoUri || item.photoUris?.[0] || null);
  }, [visible, item]);

  const pickPhoto = async () => {
    playTapSound();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão', 'Precisamos de acesso à galeria.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      base64: !!userId,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (userId && asset.uri) {
      setUploading(true);
      try {
        let base64 = asset.base64;
        if (!base64) base64 = await readImageAsBase64(asset.uri);
        const url = await uploadClientPhoto(base64, userId, `loja-item-${item?.id || Date.now()}`);
        setPhotoUri(url);
      } catch (e) {
        console.warn('Erro upload foto item:', e);
        Alert.alert('Erro', 'Não foi possível enviar a foto.');
      }
      setUploading(false);
    } else if (asset.uri) {
      setPhotoUri(asset.uri);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return Alert.alert('Erro', 'Informe o nome.');
    playTapSound();
    const p = parseFloat(String(price).replace(',', '.')) || 0;
    const d = parseFloat(String(discount).replace(',', '.')) || 0;
    const payload = {
      name: name.trim(),
      price: p,
      discount: d,
      photoUri: photoUri || null,
      photoUris: photoUri ? [photoUri] : null,
    };
    onSave?.(payload);
  };

  if (!visible || !item) return null;

  return (
    <Modal visible transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={st.header}>
            <View style={{ flex: 1 }}>
              <Text style={[st.title, { color: colors.text }]}>
                Editar {isServico ? 'serviço' : 'produto'}
              </Text>
              <Text style={[st.sub, { color: colors.textSecondary }]}>
                Alterações refletem na loja e no cadastro do app.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[st.label, { color: colors.textSecondary }]}>Foto</Text>
            <TouchableOpacity
              onPress={pickPhoto}
              disabled={uploading}
              style={[st.photoRow, { borderColor: colors.border, backgroundColor: colors.bg }]}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={st.photo} resizeMode="cover" />
              ) : (
                <View style={[st.photo, st.photoPh, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="camera" size={28} color={colors.primary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                {uploading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Text style={{ fontWeight: '700', color: colors.primary }}>{photoUri ? 'Trocar foto' : 'Adicionar foto'}</Text>
                    {photoUri ? (
                      <TouchableOpacity onPress={() => { playTapSound(); setPhotoUri(null); }} style={{ marginTop: 6 }}>
                        <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Remover foto</Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                )}
              </View>
            </TouchableOpacity>

            <Text style={[st.label, { color: colors.textSecondary, marginTop: 16 }]}>Nome</Text>
            <TextInput
              style={[st.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
              value={name}
              onChangeText={setName}
              placeholder="Nome do item"
              placeholderTextColor={colors.textSecondary}
            />

            <View style={st.row}>
              <View style={st.half}>
                <Text style={[st.label, { color: colors.textSecondary }]}>Preço (R$)</Text>
                <MoneyInput
                  value={price}
                  onChange={setPrice}
                  colors={colors}
                  containerStyle={[st.moneyWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}
                />
              </View>
              <View style={st.half}>
                <Text style={[st.label, { color: colors.textSecondary }]}>Desconto (R$)</Text>
                <MoneyInput
                  value={discount}
                  onChange={setDiscount}
                  colors={colors}
                  containerStyle={[st.moneyWrap, { backgroundColor: colors.bg, borderColor: colors.border }]}
                />
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[st.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={saving || uploading}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={st.saveBtnText}>Salvar no app e na loja</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  card: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '90%',
    borderWidth: 1,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 4, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, marginBottom: 8 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  photo: { width: 72, height: 72, borderRadius: 12 },
  photoPh: { justifyContent: 'center', alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  moneyWrap: { borderWidth: 1, borderRadius: 12 },
  saveBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
