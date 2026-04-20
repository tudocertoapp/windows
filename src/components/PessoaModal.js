import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, Alert, Image, Keyboard, KeyboardAvoidingView, Platform, ActivityIndicator, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { readImageAsBase64 } from '../utils/readImageAsBase64';
import { hasContacts, requestContactsPermissions, getContactsAsync, Fields } from '../utils/contacts';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { uploadClientPhoto } from '../utils/uploadClientPhoto';
import { DatePickerInput } from './DatePickerInput';
import { useIsDesktopLayout } from '../utils/platformLayout';

const FIELD_GAP = 16;
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12 },
  box: { width: '100%', maxWidth: 520, minHeight: 480, maxHeight: '90%', borderRadius: 20, padding: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  closeBtn: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  phoneRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  phoneInput: { flex: 1 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
});

/** Modal apenas para família/amigos (pessoal) - cadastro de aniversariantes */
export function PessoaModal({ visible, pessoa, onSave, onClose }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const isDesktopWeb = Platform.OS === 'web' && useIsDesktopLayout();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [foto, setFoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [contactPickerVisible, setContactPickerVisible] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  const isEdit = !!pessoa?.id;
  const getContactPhone = (c) => (c.phoneNumbers && c.phoneNumbers[0] ? c.phoneNumbers[0].number : '');
  const formatPhoneDisplay = (phoneStr) => {
    const p = String(phoneStr || '').replace(/\D/g, '');
    if (p.length === 11 && p.startsWith('1')) return p.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    if (p.length === 10) return p.replace(/^(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    return phoneStr || '';
  };
  const searchDebounceRef = useRef(null);
  useEffect(() => {
    if (!contactPickerVisible) return;
    const q = contactSearch.trim();
    if (q.length < 2) {
      setContacts([]);
      setLoadingContacts(false);
      return;
    }
    if (!hasContacts) {
      setLoadingContacts(false);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      setLoadingContacts(true);
      try {
        const { status } = await requestContactsPermissions();
        if (status !== 'granted') {
          Alert.alert('Permissão', 'Permita acesso aos contatos para buscar.');
          setLoadingContacts(false);
          return;
        }
        const { data } = await getContactsAsync({
          fields: [Fields.PhoneNumbers, Fields.Name],
          name: q,
          pageSize: 30,
        });
        setContacts((data || []).filter((c) => c.phoneNumbers?.length > 0));
      } catch (e) {
        Alert.alert('Erro', 'Não foi possível buscar os contatos.');
      }
      setLoadingContacts(false);
    }, 350);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [contactPickerVisible, contactSearch]);

  const openContactPicker = () => {
    setContactPickerVisible(true);
    setContactSearch('');
    setContacts([]);
  };

  const selectContact = (cont) => {
    const ph = getContactPhone(cont);
    if (ph) setPhone(formatPhoneDisplay(ph));
    if (!name.trim() && cont.name) setName(cont.name.trim());
    setContactPickerVisible(false);
  };

  useEffect(() => {
    if (visible) {
      if (pessoa) {
        setName(pessoa.name || '');
        setPhone(pessoa.phone || '');
        setBirthDate(pessoa.birthDate || pessoa.dataNascimento || '');
        setFoto(pessoa.foto || null);
      } else {
        setName('');
        setPhone('');
        setBirthDate('');
        setFoto(null);
      }
    }
  }, [visible, pessoa]);

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
          const url = await uploadClientPhoto(asset.base64, user.id, pessoa?.id);
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
        fotoUrl = await uploadClientPhoto(base64, user.id, pessoa?.id);
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
      email: '',
      phone: phone.trim(),
      address: null,
      cpf: null,
      linkInstagram: null,
      birthDate: birthDate.trim() || null,
      foto: fotoUrl || null,
      nivel: 'novo_cliente',
      tipo: 'pessoal',
      tags: [],
    });
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', justifyContent: isDesktopWeb ? 'flex-start' : 'center', alignItems: isDesktopWeb ? 'stretch' : 'center', flex: 1 }}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.box,
              { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
              isDesktopWeb ? { maxWidth: '100%', minHeight: '100%', maxHeight: '100%', borderRadius: 0 } : null,
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <View style={[styles.titleRow, { flex: 1, gap: 6 }]}>
                <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="people-outline" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>{isEdit ? 'Editar aniversariante' : 'Cadastro de aniversariante'}</Text>
              </View>
              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.primaryRgba?.(0.2) }]} onPress={onClose}>
                <Ionicons name="close" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={{ paddingBottom: 12 }}>
              <Text style={[styles.label, { color: colors.text }]}>Foto (opcional)</Text>
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
              <Text style={[styles.label, { color: colors.text }]}>Nome</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} placeholder="Nome" value={name} onChangeText={setName} placeholderTextColor={colors.textSecondary} />
              <View style={{ height: FIELD_GAP }} />
              <Text style={[styles.label, { color: colors.text }]}>Telefone</Text>
              <View style={styles.phoneRow}>
                <TextInput style={[styles.input, styles.phoneInput, { borderColor: colors.border, color: colors.text }]} placeholder="Telefone (para enviar parabéns)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={colors.textSecondary} />
                {hasContacts ? (
                  <TouchableOpacity onPress={openContactPicker} style={[styles.contactBtn, { borderColor: colors.primary, backgroundColor: colors.primaryRgba?.(0.15) ?? colors.primary + '25' }]}>
                    <Ionicons name="people-outline" size={20} color={colors.primary} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>Contatos</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={{ height: FIELD_GAP }} />
              <Text style={[styles.label, { color: colors.text }]}>Data de nascimento</Text>
              <DatePickerInput value={birthDate} onChange={setBirthDate} colors={colors} placeholder="DD/MM/AAAA" style={[styles.input, { backgroundColor: colors.bg }]} />
            </View>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{isEdit ? 'Salvar' : 'Cadastrar'}</Text>}
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
      <Modal visible={contactPickerVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={0}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { Keyboard.dismiss(); setContactPickerVisible(false); }} activeOpacity={1} />
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ maxHeight: '85%', backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Buscar nos contatos</Text>
                  <TouchableOpacity onPress={() => { Keyboard.dismiss(); setContactPickerVisible(false); }} style={{ padding: 8 }}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text, marginBottom: 12 }]}
                  placeholder="Buscar por nome ou telefone..."
                  placeholderTextColor={colors.textSecondary}
                  value={contactSearch}
                  onChangeText={setContactSearch}
                  returnKeyType="search"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {loadingContacts ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                ) : contacts.length === 0 ? (
                  <Text style={{ paddingVertical: 24, textAlign: 'center', color: colors.textSecondary }}>
                    {contactSearch.trim().length < 2 ? 'Digite ao menos 2 caracteres para buscar' : 'Nenhum contato encontrado'}
                  </Text>
                ) : (
                  <FlatList
                    data={contacts}
                    extraData={contactSearch}
                    keyExtractor={(c) => c.id || `${c.name}-${getContactPhone(c)}`}
                    style={{ maxHeight: 340 }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => selectContact(item)}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.border + '60' }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryRgba?.(0.2), justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="person" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }} numberOfLines={1}>{item.name || 'Sem nome'}</Text>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{formatPhoneDisplay(getContactPhone(item))}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              />
            )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Modal>
  );
}
