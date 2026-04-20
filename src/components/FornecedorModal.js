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
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useIsDesktopLayout } from '../utils/platformLayout';
import { ModalFormRow, ModalFormCell } from './ModalFormLayout';

const { width: SW } = Dimensions.get('window');
const GAP = 20;
const CARD_MAX_WIDTH = Math.min(SW - 8, 520);
const SCROLL_MAX_HEIGHT = Math.min(520, 580);

export function FornecedorModal({ visible, fornecedor, onSave, onClose }) {
  const { colors } = useTheme();
  const isDesktopWeb = Platform.OS === 'web' && useIsDesktopLayout();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkSite, setLinkSite] = useState('');
  const [linkInstagram, setLinkInstagram] = useState('');
  const [linkLoja, setLinkLoja] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [estado, setEstado] = useState('');

  const isEdit = !!fornecedor?.id;

  useEffect(() => {
    if (visible) {
      if (fornecedor) {
        setName(fornecedor.name || '');
        setEmail(fornecedor.email || '');
        setPhone(fornecedor.phone || '');
        setLinkSite(fornecedor.linkSite || '');
        setLinkInstagram(fornecedor.linkInstagram || '');
        setLinkLoja(fornecedor.linkLoja || '');
        setCnpj(fornecedor.cnpj || '');
        setEstado(fornecedor.estado || '');
      } else {
        setName('');
        setEmail('');
        setPhone('');
        setLinkSite('');
        setLinkInstagram('');
        setLinkLoja('');
        setCnpj('');
        setEstado('');
      }
    }
  }, [visible, fornecedor]);

  const handleSave = () => {
    if (!name.trim()) return Alert.alert('Erro', 'Preencha o nome.');
    onSave({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      linkSite: linkSite.trim() || null,
      linkInstagram: linkInstagram.trim() || null,
      linkLoja: linkLoja.trim() || null,
      cnpj: cnpj.trim() || null,
      estado: estado.trim() || null,
    });
    onClose();
  };

  if (!visible) return null;

  const sectionGap = { marginBottom: GAP };

  return (
    <Modal visible transparent animationType="fade">
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[s.keyboardView, isDesktopWeb ? { justifyContent: 'flex-start' } : null]}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[
              s.card,
              { backgroundColor: colors.card, borderColor: colors.border },
              isDesktopWeb ? { maxWidth: '100%', minHeight: '100%', maxHeight: '100%', borderRadius: 0 } : null,
            ]}
          >
            <View style={[s.header, sectionGap]}>
              <Text style={[s.title, { color: colors.primary }]}>{isEdit ? 'EDITAR FORNECEDOR' : 'NOVO FORNECEDOR'}</Text>
              <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.primaryRgba(0.2) }]} onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled style={[s.scroll, isDesktopWeb ? { maxHeight: undefined, flex: 1 } : null]} contentContainerStyle={s.scrollContent}>
              <ModalFormRow style={sectionGap}>
                <ModalFormCell fullWidth>
                  <Text style={[s.label, { color: colors.textSecondary }]}>NOME</Text>
                  <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]} placeholder="Nome do fornecedor" value={name} onChangeText={setName} placeholderTextColor={colors.textSecondary} />
                </ModalFormCell>
              </ModalFormRow>

              <ModalFormRow style={sectionGap}>
                <ModalFormCell minWidth={220}>
                  <Text style={[s.label, { color: colors.textSecondary }]}>E-MAIL</Text>
                  <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]} placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" placeholderTextColor={colors.textSecondary} />
                </ModalFormCell>
                <ModalFormCell minWidth={180}>
                  <Text style={[s.label, { color: colors.textSecondary }]}>TELEFONE</Text>
                  <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]} placeholder="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={colors.textSecondary} />
                </ModalFormCell>
              </ModalFormRow>

              <ModalFormRow style={sectionGap}>
                <ModalFormCell minWidth={240}>
                  <Text style={[s.label, { color: colors.textSecondary }]}>SITE (URL)</Text>
                  <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]} placeholder="https://..." value={linkSite} onChangeText={setLinkSite} keyboardType="url" placeholderTextColor={colors.textSecondary} />
                </ModalFormCell>
                <ModalFormCell minWidth={240}>
                  <Text style={[s.label, { color: colors.textSecondary }]}>INSTAGRAM (URL)</Text>
                  <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]} placeholder="https://instagram.com/..." value={linkInstagram} onChangeText={setLinkInstagram} keyboardType="url" placeholderTextColor={colors.textSecondary} />
                </ModalFormCell>
              </ModalFormRow>

              <ModalFormRow style={sectionGap}>
                <ModalFormCell minWidth={240}>
                  <Text style={[s.label, { color: colors.textSecondary }]}>LOJA (URL)</Text>
                  <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]} placeholder="Link da loja" value={linkLoja} onChangeText={setLinkLoja} keyboardType="url" placeholderTextColor={colors.textSecondary} />
                </ModalFormCell>
                <ModalFormCell minWidth={180}>
                  <Text style={[s.label, { color: colors.textSecondary }]}>CNPJ</Text>
                  <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]} placeholder="00.000.000/0000-00" value={cnpj} onChangeText={setCnpj} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} />
                </ModalFormCell>
                <ModalFormCell minWidth={120} maxWidth={160}>
                  <Text style={[s.label, { color: colors.textSecondary }]}>ESTADO (UF)</Text>
                  <TextInput style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]} placeholder="SP" value={estado} onChangeText={setEstado} placeholderTextColor={colors.textSecondary} maxLength={2} />
                </ModalFormCell>
              </ModalFormRow>
            </ScrollView>
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={s.saveBtnText}>{isEdit ? 'Salvar alterações' : 'CADASTRAR FORNECEDOR'}</Text>
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
  saveBtn: { borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: GAP },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
