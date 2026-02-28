import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, Image, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const NIVEL_LABELS = { orcamento: 'Orçamento', lead: 'Lead', fechou: 'Fechou' };

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 360, maxHeight: '90%', borderRadius: 20, padding: 20, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  closeBtn: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
});

export function ClienteModal({ visible, cliente, onSave, onClose }) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [foto, setFoto] = useState(null);
  const [nivel, setNivel] = useState('orcamento');

  const isEdit = !!cliente?.id;

  useEffect(() => {
    if (visible) {
      if (cliente) {
        setName(cliente.name || '');
        setEmail(cliente.email || '');
        setPhone(cliente.phone || '');
        setAddress(cliente.address || '');
        setFoto(cliente.foto || null);
        setNivel(cliente.nivel || 'orcamento');
      } else {
        setName('');
        setEmail('');
        setPhone('');
        setAddress('');
        setFoto(null);
        setNivel('orcamento');
      }
    }
  }, [visible, cliente]);

  const pickFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão', 'Precisamos de acesso à galeria.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setFoto(result.assets[0].uri);
  };

  const handleSave = () => {
    if (!name.trim()) return Alert.alert('Erro', 'Preencha o nome.');
    onSave({ name: name.trim(), email: email.trim(), phone: phone.trim(), address: address.trim(), foto: foto || null, nivel: nivel || 'orcamento' });
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[styles.box, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.primaryRgba(0.2) }]} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>{isEdit ? 'Editar cliente' : 'Novo cliente'}</Text>
            <ScrollView showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled" style={{ maxHeight: 480 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Foto do cliente</Text>
              <TouchableOpacity onPress={pickFoto} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg }}>
                {foto ? (
                  <Image source={{ uri: foto }} style={{ width: 56, height: 56, borderRadius: 28 }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="camera" size={24} color={colors.primary} />
                  </View>
                )}
                <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600' }}>{foto ? 'Trocar foto' : 'Carregar foto'}</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Nível / Status</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['orcamento', 'lead', 'fechou'].map((n) => (
                  <TouchableOpacity key={n} onPress={() => setNivel(n)} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: nivel === n ? colors.primary : colors.border, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: nivel === n ? '#fff' : colors.text }}>{NIVEL_LABELS[n]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="Nome" value={name} onChangeText={setName} placeholderTextColor={colors.textSecondary} />
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" placeholderTextColor={colors.textSecondary} />
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={colors.textSecondary} />
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="Endereço" value={address} onChangeText={setAddress} placeholderTextColor={colors.textSecondary} />
            </ScrollView>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Cadastrar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}
