import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const FIELD_GAP = 20;
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 360, maxHeight: '90%', borderRadius: 20, padding: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700', flex: 1 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  closeBtn: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  keyboardBtn: { position: 'absolute', top: 12, right: 52, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
});

export function FornecedorModal({ visible, fornecedor, onSave, onClose }) {
  const { colors } = useTheme();
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

  return (
    <Modal visible transparent animationType="fade">
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[s.box, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', position: 'relative', marginBottom: 4 }}>
              <View style={[s.titleRow, { flex: 1, marginBottom: 0 }]}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryRgba?.(0.2) ?? (colors.primary + '25'), justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="business-outline" size={22} color={colors.primary} />
                </View>
                <Text style={[s.title, { color: colors.text }]}>{isEdit ? 'Editar fornecedor' : 'Novo fornecedor'}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, position: 'absolute', top: -8, right: 0 }}>
                <TouchableOpacity style={[s.keyboardBtn, { backgroundColor: colors.primaryRgba?.(0.2) }]} onPress={() => Keyboard.dismiss()}>
                  <Ionicons name="keyboard-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.primaryRgba?.(0.2) }]} onPress={onClose}>
                  <Ionicons name="close" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 16 }}>
              <Text style={[s.label, { color: colors.text, marginTop: 0 }]}>Nome</Text>
              <TextInput style={[s.input, { borderColor: colors.border, color: colors.text }]} placeholder="Nome do fornecedor" value={name} onChangeText={setName} placeholderTextColor={colors.textSecondary} />
              <View style={{ height: FIELD_GAP }} />
              <Text style={[s.label, { color: colors.text }]}>E-mail</Text>
              <TextInput style={[s.input, { borderColor: colors.border, color: colors.text }]} placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" placeholderTextColor={colors.textSecondary} />
              <View style={{ height: FIELD_GAP }} />
              <Text style={[s.label, { color: colors.text }]}>Telefone</Text>
              <TextInput style={[s.input, { borderColor: colors.border, color: colors.text }]} placeholder="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={colors.textSecondary} />
              <View style={{ height: FIELD_GAP }} />
              <Text style={[s.label, { color: colors.text }]}>Site (URL)</Text>
              <TextInput style={[s.input, { borderColor: colors.border, color: colors.text }]} placeholder="https://..." value={linkSite} onChangeText={setLinkSite} keyboardType="url" placeholderTextColor={colors.textSecondary} />
              <View style={{ height: FIELD_GAP }} />
              <Text style={[s.label, { color: colors.text }]}>Instagram (URL)</Text>
              <TextInput style={[s.input, { borderColor: colors.border, color: colors.text }]} placeholder="https://instagram.com/..." value={linkInstagram} onChangeText={setLinkInstagram} keyboardType="url" placeholderTextColor={colors.textSecondary} />
              <View style={{ height: FIELD_GAP }} />
              <Text style={[s.label, { color: colors.text }]}>Loja (URL)</Text>
              <TextInput style={[s.input, { borderColor: colors.border, color: colors.text }]} placeholder="Link da loja" value={linkLoja} onChangeText={setLinkLoja} keyboardType="url" placeholderTextColor={colors.textSecondary} />
              <View style={{ height: FIELD_GAP }} />
              <Text style={[s.label, { color: colors.text }]}>CNPJ</Text>
              <TextInput style={[s.input, { borderColor: colors.border, color: colors.text }]} placeholder="00.000.000/0000-00" value={cnpj} onChangeText={setCnpj} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} />
              <View style={{ height: FIELD_GAP }} />
              <Text style={[s.label, { color: colors.text }]}>Estado (UF)</Text>
              <TextInput style={[s.input, { borderColor: colors.border, color: colors.text }]} placeholder="Ex: SP, RJ" value={estado} onChangeText={setEstado} placeholderTextColor={colors.textSecondary} maxLength={2} />
            </ScrollView>
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={s.saveBtnText}>{isEdit ? 'Salvar' : 'Cadastrar'}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}
