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
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { MoneyInput } from './MoneyInput';

const { width: SW } = Dimensions.get('window');
const GAP = 20;
const CARD_MAX_WIDTH = Math.min(SW - 8, 520);
const SCROLL_MAX_HEIGHT = Math.min(520, 580);

export function ServicoFormModal({ visible, servico, onSave, onClose }) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [photoUris, setPhotoUris] = useState([]);

  const isEdit = !!servico?.id;

  useEffect(() => {
    if (visible && servico) {
      setName(servico.name || '');
      setPrice(servico.price != null ? String(servico.price).replace('.', ',') : '');
      setDiscount(servico.discount != null ? String(servico.discount).replace('.', ',') : '');
      setPhotoUris(servico.photoUris?.length ? [...servico.photoUris] : (servico.photoUri ? [servico.photoUri] : []));
    } else if (visible && !servico) {
      setName('');
      setPrice('');
      setDiscount('');
      setPhotoUris([]);
    }
  }, [visible, servico]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão', 'Precisamos de acesso à galeria.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setPhotoUris((prev) => [...prev, result.assets[0].uri]);
  };

  const removePhoto = (index) => setPhotoUris((prev) => prev.filter((_, i) => i !== index));

  const handleSave = () => {
    if (!name.trim()) return Alert.alert('Erro', 'Preencha o nome do serviço.');
    const p = parseFloat(String(price).replace(',', '.')) || 0;
    const d = parseFloat(String(discount).replace(',', '.')) || 0;
    onSave({
      name: name.trim(),
      price: p,
      discount: d,
      photoUris: photoUris.length > 0 ? photoUris : null,
      photoUri: photoUris[0] || null,
    });
    onClose();
  };

  if (!visible) return null;

  const sectionGap = { marginBottom: GAP };

  return (
    <Modal visible transparent animationType="fade">
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.keyboardView}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[s.header, sectionGap]}>
              <Text style={[s.title, { color: colors.primary }]}>{isEdit ? 'EDITAR SERVIÇO' : 'NOVO SERVIÇO'}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.primaryRgba(0.2) }]} onPress={() => Keyboard.dismiss()}>
                  <Ionicons name="keyboard-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.primaryRgba(0.2) }]} onPress={onClose}>
                  <Ionicons name="close" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled style={s.scroll} contentContainerStyle={s.scrollContent}>
              <Text style={[s.label, { color: colors.textSecondary }]}>FOTO DO SERVIÇO (OPCIONAL)</Text>
              <View style={[s.photoRow, sectionGap]}>
                {photoUris.map((uri, idx) => (
                  <View key={idx} style={s.photoThumbWrap}>
                    <Image source={{ uri }} style={s.photoThumb} resizeMode="cover" />
                    <TouchableOpacity style={s.removePhotoBtn} onPress={() => removePhoto(idx)}>
                      <Ionicons name="close-circle" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity onPress={pickImage} style={[s.photoAdd, { borderColor: colors.primary + '80' }]}>
                  <Ionicons name="add" size={28} color={colors.primary} />
                </TouchableOpacity>
              </View>

              <Text style={[s.label, { color: colors.textSecondary }]}>NOME DO SERVIÇO</Text>
              <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }, sectionGap]} placeholder="Ex: Corte de cabelo, Consultoria..." value={name} onChangeText={setName} placeholderTextColor={colors.textSecondary} />

              <View style={[s.row, sectionGap]}>
                <View style={s.half}>
                  <Text style={[s.label, { color: colors.textSecondary }]}>PREÇO (R$)</Text>
                  <MoneyInput value={price} onChange={setPrice} colors={colors} containerStyle={[s.inputWrap, { backgroundColor: colors.bg, borderColor: colors.border }]} />
                </View>
                <View style={s.half}>
                  <Text style={[s.label, { color: colors.textSecondary }]}>DESCONTO (R$)</Text>
                  <MoneyInput value={discount} onChange={setDiscount} colors={colors} containerStyle={[s.inputWrap, { backgroundColor: colors.bg, borderColor: colors.border }]} />
                </View>
              </View>
            </ScrollView>
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={s.saveBtnText}>{isEdit ? 'Salvar alterações' : 'CADASTRAR SERVIÇO'}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 8 },
  keyboardView: { flex: 1, width: '100%', justifyContent: 'center', maxHeight: '95%' },
  card: { width: '100%', maxWidth: CARD_MAX_WIDTH, borderRadius: 20, padding: GAP, maxHeight: '95%', borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', textTransform: 'uppercase' },
  closeBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  scroll: { maxHeight: SCROLL_MAX_HEIGHT },
  scrollContent: { paddingBottom: GAP * 2 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15 },
  inputWrap: { borderWidth: 1, borderRadius: 12 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  photoThumbWrap: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photoThumb: { width: 72, height: 72, borderRadius: 12 },
  removePhotoBtn: { position: 'absolute', top: 2, right: 2, padding: 2, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },
  photoAdd: { width: 72, height: 72, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', gap: GAP },
  half: { flex: 1 },
  saveBtn: { borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: GAP },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
