import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, Image, Keyboard, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { readImageAsBase64 } from '../utils/readImageAsBase64';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { usePlan } from '../contexts/PlanContext';
import { uploadClientPhoto } from '../utils/uploadClientPhoto';

const NIVEL_OPTIONS = [
  { id: 'novo_cliente', label: 'Novo cliente', color: '#84cc16' },
  { id: 'orcamento', label: 'Orçamento', color: '#6b7280' },
  { id: 'proposta', label: 'Proposta', color: '#8b5cf6' },
  { id: 'agendado', label: 'Agendado', color: '#0ea5e9' },
  { id: 'fixo', label: 'Fixo', color: '#10b981' },
  { id: 'lead', label: 'Lead', color: '#f59e0b' },
  { id: 'fechou', label: 'Fechou', color: '#10b981' },
];

const ETIQUETAS_GERAL = [
  { id: 'lead', label: 'Lead', color: '#f59e0b', icon: 'person-add-outline' },
  { id: 'orcamento', label: 'Orçamento', color: '#6b7280', icon: 'document-text-outline' },
  { id: 'proposta', label: 'Proposta', color: '#8b5cf6', icon: 'briefcase-outline' },
  { id: 'agendado', label: 'Agendado', color: '#0ea5e9', icon: 'calendar-outline' },
  { id: 'fixo', label: 'Fixo', color: '#10b981', icon: 'star-outline' },
  { id: 'pago', label: 'Pago', color: '#22c55e', icon: 'cash-outline' },
  { id: 'pedido_finalizado', label: 'Pedido finalizado', color: '#10b981', icon: 'checkmark-done-outline' },
];

const ETIQUETAS_SUGESTOES = [
  { id: 'prioritario', label: 'Prioritário', color: '#ef4444' },
  { id: 'retorno', label: 'Retorno', color: '#f97316' },
  { id: 'vip', label: 'VIP', color: '#a855f7' },
];

const FIELD_GAP = 16;
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12 },
  box: { width: '100%', maxWidth: 520, maxHeight: '92%', borderRadius: 20, padding: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  closeBtn: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
});

export function ClienteModal({ visible, cliente, onSave, onClose, defaultTipo }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showEmpresaFeatures, viewMode } = usePlan();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [cpf, setCpf] = useState('');
  const [linkInstagram, setLinkInstagram] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [foto, setFoto] = useState(null);
  const [showNivelPicker, setShowNivelPicker] = useState(false);
  const [showEtiquetasPicker, setShowEtiquetasPicker] = useState(false);
  const [tags, setTags] = useState([]);
  const [nivel, setNivel] = useState('novo_cliente');
  const [tipo, setTipo] = useState('empresa');
  const [saving, setSaving] = useState(false);

  const isEdit = !!cliente?.id;

  useEffect(() => {
    if (visible) {
      if (cliente) {
        setName(cliente.name || '');
        setEmail(cliente.email || '');
        setPhone(cliente.phone || '');
        setAddress(cliente.address || '');
        setCpf(cliente.cpf || '');
        setLinkInstagram(cliente.linkInstagram || cliente.link_instagram || '');
        setBirthDate(cliente.birthDate || cliente.dataNascimento || '');
        setFoto(cliente.foto || null);
        const tagsArr = Array.isArray(cliente.tags) ? cliente.tags : [];
        setTags(tagsArr);
        if (cliente.nivel) setNivel(cliente.nivel);
        else if (tagsArr.includes('lead')) setNivel('lead');
        else if (tagsArr.some((t) => ['pago', 'pedido_finalizado'].includes(t))) setNivel('fechou');
        else setNivel('orcamento');
        setTipo(cliente.tipo || 'empresa');
      } else {
        setName('');
        setEmail('');
        setPhone('');
        setAddress('');
        setCpf('');
        setLinkInstagram('');
        setBirthDate('');
        setFoto(null);
        setTags([]);
        setNivel('novo_cliente');
        setTipo(defaultTipo || viewMode || 'empresa');
      }
    }
  }, [visible, cliente, defaultTipo, viewMode]);

  const toggleTag = (tagId) => {
    setTags((prev) => (prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]));
  };

  const pickFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão', 'Precisamos de acesso à galeria.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: !!user,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (user && asset.base64) {
        try {
          const url = await uploadClientPhoto(asset.base64, user.id, cliente?.id);
          setFoto(url);
        } catch (e) {
          console.warn('Erro ao fazer upload da foto:', e);
          Alert.alert('Erro', 'Não foi possível salvar a foto. Tente novamente.');
        }
      } else {
        setFoto(asset.uri);
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Erro', 'Preencha o nome.');
    let fotoUrl = foto;
    const needsUpload = foto && user && (foto.startsWith('file://') || foto.startsWith('blob:') || (foto.startsWith('http') && !foto.includes('supabase')));
    if (needsUpload) {
      setSaving(true);
      try {
        const base64 = await readImageAsBase64(foto);
        fotoUrl = await uploadClientPhoto(base64, user.id, cliente?.id);
      } catch (e) {
        console.warn('Erro ao fazer upload da foto:', e);
        Alert.alert('Erro', 'Não foi possível salvar a foto. Tente novamente.');
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    onSave({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      cpf: cpf.trim() || null,
      linkInstagram: linkInstagram.trim() || null,
      birthDate: birthDate.trim() || null,
      foto: fotoUrl || null,
      nivel,
      tags,
      tipo: showEmpresaFeatures ? tipo : 'pessoal',
    });
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[styles.box, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <View style={[styles.titleRow, { flex: 1 }]}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryRgba?.(0.2) ?? (colors.primary + '25'), justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="person-outline" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>{isEdit ? 'Editar cliente' : 'Novo cliente'}</Text>
              </View>
              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.primaryRgba?.(0.2) }]} onPress={onClose}>
                <Ionicons name="close" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled style={{ maxHeight: 520 }} contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={[styles.label, { color: colors.text }]}>Foto do cliente</Text>
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
              <View style={{ height: FIELD_GAP }} />
              {showEmpresaFeatures && (
                <>
                  <Text style={[styles.label, { color: colors.text }]}>Documento principal</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: FIELD_GAP }}>
                    <TouchableOpacity
                      onPress={() => setTipo('pessoal')}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: tipo === 'pessoal' ? colors.primary : colors.border, backgroundColor: tipo === 'pessoal' ? (colors.primaryRgba?.(0.15) ?? colors.primary + '25') : colors.bg }}
                    >
                      <Ionicons name="person-outline" size={20} color={tipo === 'pessoal' ? colors.primary : colors.textSecondary} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: tipo === 'pessoal' ? colors.primary : colors.textSecondary }}>CPF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setTipo('empresa')}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: tipo === 'empresa' ? colors.primary : colors.border, backgroundColor: tipo === 'empresa' ? (colors.primaryRgba?.(0.15) ?? colors.primary + '25') : colors.bg }}
                    >
                      <Ionicons name="business-outline" size={20} color={tipo === 'empresa' ? colors.primary : colors.textSecondary} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: tipo === 'empresa' ? colors.primary : colors.textSecondary }}>CNPJ</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              <Text style={[styles.label, { color: colors.text }]}>Identificação</Text>
              <TouchableOpacity onPress={() => setShowNivelPicker(!showNivelPicker)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.bg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: (NIVEL_OPTIONS.find((o) => o.id === nivel))?.color || colors.border, marginRight: 10 }} />
                  <Text style={{ fontSize: 15, color: colors.text }}>{(NIVEL_OPTIONS.find((o) => o.id === nivel))?.label || nivel || 'Selecionar'}</Text>
                </View>
                <Ionicons name={showNivelPicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {showNivelPicker && (
                <View style={{ backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, marginTop: 8, maxHeight: 280 }}>
                  <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator>
                    {NIVEL_OPTIONS.map((o) => (
                      <TouchableOpacity key={o.id} onPress={() => { setNivel(o.id); setShowNivelPicker(false); }} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: o.color }} />
                        <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{o.label}</Text>
                        {nivel === o.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              <View style={{ height: FIELD_GAP }} />
              <Text style={[styles.label, { color: colors.text }]}>Etiquetas (opcional)</Text>
              <TouchableOpacity onPress={() => setShowEtiquetasPicker(!showEtiquetasPicker)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.bg }}>
                <Text style={{ fontSize: 15, color: tags.length ? colors.text : colors.textSecondary }}>{tags.length ? `${tags.length} etiqueta(s) selecionada(s)` : 'Selecionar etiquetas'}</Text>
                <Ionicons name={showEtiquetasPicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {showEtiquetasPicker && (
                <View style={{ backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, marginTop: 8, maxHeight: 300 }}>
                  <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator nestedScrollEnabled>
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
              <View style={{ height: FIELD_GAP }} />
              <Text style={[styles.label, { color: colors.text }]}>{tipo === 'empresa' ? 'Razão social' : 'Nome'}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder={tipo === 'empresa' ? 'Razão social da empresa' : 'Nome'}
                value={name}
                onChangeText={setName}
                placeholderTextColor={colors.textSecondary}
              />
              <View style={{ height: FIELD_GAP }} />
              <Text style={[styles.label, { color: colors.text }]}>E-mail</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" placeholderTextColor={colors.textSecondary} />
              <View style={{ height: FIELD_GAP }} />
              <Text style={[styles.label, { color: colors.text }]}>Telefone</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={colors.textSecondary} />
              <View style={{ height: FIELD_GAP }} />
              <Text style={[styles.label, { color: colors.text }]}>{tipo === 'empresa' ? 'CNPJ' : 'CPF'}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder={tipo === 'empresa' ? '00.000.000/0000-00' : '000.000.000-00'}
                value={cpf}
                onChangeText={setCpf}
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
              <View style={{ height: FIELD_GAP }} />
              <Text style={[styles.label, { color: colors.text }]}>Link Instagram</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="https://instagram.com/seu-perfil" value={linkInstagram} onChangeText={setLinkInstagram} keyboardType="url" autoCapitalize="none" placeholderTextColor={colors.textSecondary} />
              <View style={{ height: FIELD_GAP }} />
              <Text style={[styles.label, { color: colors.text }]}>Data de nascimento</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="DD/MM/AAAA (para lembrete de aniversário)" value={birthDate} onChangeText={setBirthDate} keyboardType="numbers-and-punctuation" placeholderTextColor={colors.textSecondary} />
              <View style={{ height: FIELD_GAP }} />
              <Text style={[styles.label, { color: colors.text }]}>Endereço</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="Rua, número, bairro, cidade" value={address} onChangeText={setAddress} placeholderTextColor={colors.textSecondary} />
            </ScrollView>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{cliente ? 'Salvar' : 'Cadastrar'}</Text>}
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
