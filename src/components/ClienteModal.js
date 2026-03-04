import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, Image, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const NIVEL_LABELS = { orcamento: 'Orçamento', lead: 'Lead', fechou: 'Fechou' };

const ETIQUETAS_GERAL = [
  { id: 'favoritos', label: 'Favoritos', icon: 'heart-outline', color: null },
  { id: 'importante', label: 'Importante', icon: null, color: '#ef4444' },
  { id: 'acompanhar', label: 'Acompanhar', icon: null, color: '#06b6d4' },
  { id: 'cadastro', label: 'Cadastro', icon: null, color: '#14b8a6' },
  { id: 'fornecedor', label: 'Fornecedor', icon: null, color: '#eab308' },
];
const ETIQUETAS_SUGESTOES = [
  { id: 'novo_cliente', label: 'Novo cliente', icon: null, color: '#84cc16' },
  { id: 'novo_pedido', label: 'Novo pedido', icon: null, color: '#f97316' },
  { id: 'pagamento_pendente', label: 'Pagamento pendente', icon: null, color: '#d946ef' },
  { id: 'pago', label: 'Pago', icon: null, color: '#991b1b' },
  { id: 'pedido_finalizado', label: 'Pedido finalizado', icon: null, color: '#ca8a04' },
  { id: 'lead', label: 'Lead', icon: null, color: '#0d9488' },
];

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
  const [tags, setTags] = useState([]);
  const [showEtiquetasPicker, setShowEtiquetasPicker] = useState(false);

  const isEdit = !!cliente?.id;

  const toggleTag = (id) => {
    setTags((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  };

  useEffect(() => {
    if (visible) {
      if (cliente) {
        setName(cliente.name || '');
        setEmail(cliente.email || '');
        setPhone(cliente.phone || '');
        setAddress(cliente.address || '');
        setFoto(cliente.foto || null);
        setNivel(cliente.nivel || 'orcamento');
        setTags(Array.isArray(cliente.tags) ? cliente.tags : []);
      } else {
        setName('');
        setEmail('');
        setPhone('');
        setAddress('');
        setFoto(null);
        setNivel('orcamento');
        setTags([]);
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
    onSave({ name: name.trim(), email: email.trim(), phone: phone.trim(), address: address.trim(), foto: foto || null, nivel: nivel || 'orcamento', tags });
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[styles.box, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
            <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8, zIndex: 1 }}>
              <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }} onPress={() => Keyboard.dismiss()}>
                <Ionicons name="keyboard-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }} onPress={onClose}>
                <Ionicons name="close" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{isEdit ? 'Editar cliente' : 'Novo cliente'}</Text>
            <ScrollView showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={{ maxHeight: 480 }}>
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
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 8 }}>Etiquetas</Text>
              <TouchableOpacity onPress={() => setShowEtiquetasPicker(true)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.bg }}>
                <Text style={{ fontSize: 15, color: tags.length ? colors.text : colors.textSecondary }}>{tags.length ? `${tags.length} etiqueta(s) selecionada(s)` : 'Selecionar etiquetas'}</Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {showEtiquetasPicker && (
                <View style={{ backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, marginTop: 4, maxHeight: 320 }}>
                  <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator>
                    {ETIQUETAS_GERAL.map((e) => (
                      <TouchableOpacity key={e.id} onPress={() => toggleTag(e.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
                        {e.icon ? (
                          <View style={{ width: 24, alignItems: 'center' }}>
                            <Ionicons name={e.icon} size={20} color={colors.textSecondary} />
                          </View>
                        ) : (
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: e.color }} />
                        )}
                        <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{e.label}</Text>
                        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
                          {tags.includes(e.id) && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                        </View>
                      </TouchableOpacity>
                    ))}
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 12, marginBottom: 6, letterSpacing: 0.5 }}>SUGESTÕES</Text>
                    {ETIQUETAS_SUGESTOES.map((e) => (
                      <TouchableOpacity key={e.id} onPress={() => toggleTag(e.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: e.color }} />
                        <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{e.label}</Text>
                        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
                          {tags.includes(e.id) && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity onPress={() => setShowEtiquetasPicker(false)} style={{ marginTop: 8, paddingVertical: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              )}
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
