import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Image, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { TopBar } from '../components/TopBar';

const logoImage = require('../../assets/logo.png');

const ps = StyleSheet.create({
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 16 },
  form: { paddingHorizontal: 16, paddingVertical: 20, gap: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  btn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
});

export function PerfilScreen({ onClose, isModal }) {
  const { colors } = useTheme();
  const { profile, updateProfile, getLastFoto } = useProfile();
  const { user, signOut } = useAuth();
  const [nome, setNome] = useState(profile.nome || '');
  const [profissao, setProfissao] = useState(profile.profissao || '');
  const [empresa, setEmpresa] = useState(profile.empresa || '');
  const [cnpj, setCnpj] = useState(profile.cnpj || '');
  const [endereco, setEndereco] = useState(profile.endereco || '');
  const [telefone, setTelefone] = useState(profile.telefone || '');
  const [email, setEmail] = useState(profile.email || user?.email || '');
  const [foto, setFoto] = useState(profile.foto || null);
  const [lastFoto, setLastFoto] = useState(null);
  const hasCustomProfilePhoto = !!(profile.fotoLocal || foto);

  useEffect(() => {
    setNome(profile.nome || '');
    setProfissao(profile.profissao || '');
    setEmpresa(profile.empresa || '');
    setCnpj(profile.cnpj || '');
    setEndereco(profile.endereco || '');
    setTelefone(profile.telefone || '');
    setEmail(profile.email || user?.email || '');
    setFoto(profile.foto || null);
  }, [profile.nome, profile.foto, profile.profissao, profile.empresa, profile.cnpj, profile.endereco, profile.telefone, profile.email, user?.email]);

  useEffect(() => {
    getLastFoto().then((v) => setLastFoto(v || null));
  }, [profile.foto, getLastFoto]);

  const handleSalvar = async () => {
    try {
      await updateProfile({
        nome: nome.trim(),
        profissao: profissao.trim(),
        empresa: empresa.trim(),
        cnpj: cnpj.trim(),
        endereco: endereco.trim(),
        telefone: telefone.trim(),
        email: email.trim(),
        foto,
      });
      Alert.alert('Salvo', 'Perfil atualizado com sucesso!');
    } catch (e) {
      const msg = e?.message || '';
      const hint = msg.includes('profissao') || msg.includes('empresa') || msg.includes('cnpj') || msg.includes('column')
        ? '\n\nExecute no Supabase o arquivo supabase-profiles-empresa-dados.sql para habilitar CNPJ, endereço e telefone.'
        : '';
      Alert.alert('Erro ao salvar', msg + hint);
    }
  };

  const handleFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão', 'Precisamos de acesso à galeria.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setFoto(asset.uri);
      try {
        if (user?.id && asset.base64) {
          const { uploadProfilePhotoFromBase64 } = await import('../utils/uploadProfilePhoto');
          const publicUrl = await uploadProfilePhotoFromBase64(asset.base64, user.id);
          updateProfile({ foto: publicUrl });
          setFoto(publicUrl);
        } else {
          updateProfile({ foto: asset.uri });
        }
      } catch (e) {
        Alert.alert('Erro ao enviar foto', e?.message || 'Tente novamente. Crie o bucket "avatars" no Supabase Storage (público).');
        updateProfile({ foto: asset.uri });
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {isModal && onClose ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, backgroundColor: colors.card, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Meu Perfil</Text>
          <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TopBar title="Meu Perfil" colors={colors} />
      )}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 16 }}>
          <View style={{ width: 100, height: 100, borderRadius: 50, overflow: 'hidden', backgroundColor: '#000', marginBottom: 16 }}>
            <Image
              source={hasCustomProfilePhoto ? { uri: profile.fotoLocal || foto } : logoImage}
              style={{ width: 100, height: 100 }}
              resizeMode={hasCustomProfilePhoto ? 'cover' : 'contain'}
            />
          </View>
          <TouchableOpacity style={[ps.photoBtn, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={handleFoto}>
            <Ionicons name="camera-outline" size={20} color={colors.primary} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Carregar ou editar foto</Text>
          </TouchableOpacity>
          {foto && (
            <TouchableOpacity style={[ps.photoBtn, { borderColor: colors.border, backgroundColor: colors.card, marginTop: 10 }]} onPress={() => { setFoto(null); updateProfile({ foto: null }); }}>
              <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>Voltar à foto padrão</Text>
            </TouchableOpacity>
          )}
          {lastFoto && lastFoto !== foto && (
            <TouchableOpacity
              style={[ps.photoBtn, { borderColor: colors.primary, backgroundColor: colors.primaryRgba(0.1), marginTop: 10 }]}
              onPress={async () => {
                setFoto(lastFoto);
                await updateProfile({ foto: lastFoto });
              }}
            >
              <Ionicons name="arrow-undo-outline" size={20} color={colors.primary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Restaurar última foto</Text>
            </TouchableOpacity>
          )}
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 8 }}>Logo do app como padrão para novos usuários</Text>
        </View>
        <View style={[ps.form, { backgroundColor: colors.bg }]}>
          <View>
            <Text style={[ps.label, { color: colors.textSecondary }]}>Nome</Text>
            <TextInput style={[ps.input, { borderColor: colors.border, color: colors.text }]} placeholder="Seu nome" value={nome} onChangeText={setNome} placeholderTextColor={colors.textSecondary} />
          </View>
          <View>
            <Text style={[ps.label, { color: colors.textSecondary }]}>Profissão</Text>
            <TextInput style={[ps.input, { borderColor: colors.border, color: colors.text }]} placeholder="Sua profissão" value={profissao} onChangeText={setProfissao} placeholderTextColor={colors.textSecondary} />
          </View>
          <View>
            <Text style={[ps.label, { color: colors.textSecondary }]}>Empresa</Text>
            <TextInput style={[ps.input, { borderColor: colors.border, color: colors.text }]} placeholder="Nome da empresa" value={empresa} onChangeText={setEmpresa} placeholderTextColor={colors.textSecondary} />
          </View>
          <View>
            <Text style={[ps.label, { color: colors.textSecondary }]}>CNPJ / CPF</Text>
            <TextInput style={[ps.input, { borderColor: colors.border, color: colors.text }]} placeholder="00.000.000/0000-00 ou CPF" value={cnpj} onChangeText={setCnpj} placeholderTextColor={colors.textSecondary} keyboardType="numeric" />
          </View>
          <View>
            <Text style={[ps.label, { color: colors.textSecondary }]}>Endereço</Text>
            <TextInput style={[ps.input, { borderColor: colors.border, color: colors.text }]} placeholder="Endereço completo" value={endereco} onChangeText={setEndereco} placeholderTextColor={colors.textSecondary} />
          </View>
          <View>
            <Text style={[ps.label, { color: colors.textSecondary }]}>Telefone</Text>
            <TextInput style={[ps.input, { borderColor: colors.border, color: colors.text }]} placeholder="(00) 00000-0000" value={telefone} onChangeText={setTelefone} placeholderTextColor={colors.textSecondary} keyboardType="phone-pad" />
          </View>
          <View>
            <Text style={[ps.label, { color: colors.textSecondary }]}>E-mail (contato / relatórios)</Text>
            <TextInput style={[ps.input, { borderColor: colors.border, color: colors.text }]} placeholder="E-mail para contato" value={email} onChangeText={setEmail} placeholderTextColor={colors.textSecondary} keyboardType="email-address" autoCapitalize="none" />
          </View>
          <TouchableOpacity style={[ps.btn, { backgroundColor: colors.primary }]} onPress={handleSalvar}>
            <Text style={ps.btnText}>Salvar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[ps.btn, { backgroundColor: colors.textSecondary }]} onPress={() => Alert.alert('Sair', 'Deseja sair da sua conta?', [{ text: 'Cancelar' }, { text: 'Sair', style: 'destructive', onPress: () => { onClose?.(); signOut(); } }])}>
            <Text style={ps.btnText}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
