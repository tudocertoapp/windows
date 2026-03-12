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
  const [email, setEmail] = useState('usuario@email.com');
  const [foto, setFoto] = useState(profile.foto || null);
  const [lastFoto, setLastFoto] = useState(null);

  useEffect(() => {
    setNome(profile.nome || '');
    setProfissao(profile.profissao || '');
    setEmpresa(profile.empresa || '');
    setFoto(profile.foto || null);
  }, [profile.nome, profile.foto, profile.profissao, profile.empresa]);

  useEffect(() => {
    getLastFoto().then((v) => setLastFoto(v || null));
  }, [profile.foto, getLastFoto]);

  const handleSalvar = async () => {
    try {
      await updateProfile({ nome: nome.trim(), profissao: profissao.trim(), empresa: empresa.trim(), foto });
      Alert.alert('Salvo', 'Perfil atualizado com sucesso!');
    } catch (e) {
      const msg = e?.message || '';
      const hint = msg.includes('profissao') || msg.includes('empresa') || msg.includes('column')
        ? '\n\nExecute no SQL do Supabase o arquivo supabase-profiles-profissao-empresa.sql'
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
          <Image source={(profile.fotoLocal || foto) ? { uri: profile.fotoLocal || foto } : logoImage} style={ps.avatar} resizeMode="cover" />
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
            <TextInput style={[ps.input, { borderColor: colors.border, color: colors.text }]} placeholder="Sua empresa" value={empresa} onChangeText={setEmpresa} placeholderTextColor={colors.textSecondary} />
          </View>
          <View>
            <Text style={[ps.label, { color: colors.textSecondary }]}>E-mail</Text>
            <TextInput style={[ps.input, { borderColor: colors.border, color: colors.text }]} placeholder="E-mail" value={user?.email || email} editable={false} placeholderTextColor={colors.textSecondary} />
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
