import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Image, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { usePlan } from '../contexts/PlanContext';
import { TopBar } from '../components/TopBar';
import { buildEnderecoCompleto, pickEmpresaEnderecoFromProfile } from '../utils/empresaProfile';

const logoImage = require('../../assets/logo.png');

const ps = StyleSheet.create({
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 16 },
  form: { paddingHorizontal: 16, paddingVertical: 20, gap: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  inputHalf: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  sectionHint: { fontSize: 12, lineHeight: 17, marginBottom: 4 },
  btn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
});

function Field({ label, colors, children }) {
  return (
    <View>
      <Text style={[ps.label, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

export function PerfilScreen({ onClose, isModal }) {
  const { colors } = useTheme();
  const { profile, updateProfile, getLastFoto } = useProfile();
  const { showEmpresaFeatures } = usePlan();
  const { user, signOut } = useAuth();
  const [nome, setNome] = useState(profile.nome || '');
  const [profissao, setProfissao] = useState(profile.profissao || '');
  const [empresa, setEmpresa] = useState(profile.empresa || '');
  const [cnpj, setCnpj] = useState(profile.cnpj || '');
  const [telefone, setTelefone] = useState(profile.telefone || '');
  const [email, setEmail] = useState(profile.email || user?.email || '');
  const [instagram, setInstagram] = useState(profile.instagram || '');
  const [enderecoRua, setEnderecoRua] = useState(profile.endereco_rua || '');
  const [enderecoNumero, setEnderecoNumero] = useState(profile.endereco_numero || '');
  const [enderecoComplemento, setEnderecoComplemento] = useState(profile.endereco_complemento || '');
  const [enderecoBairro, setEnderecoBairro] = useState(profile.endereco_bairro || '');
  const [enderecoCidade, setEnderecoCidade] = useState(profile.endereco_cidade || '');
  const [enderecoEstado, setEnderecoEstado] = useState(profile.endereco_estado || '');
  const [enderecoCep, setEnderecoCep] = useState(profile.endereco_cep || '');
  const [foto, setFoto] = useState(profile.foto || null);
  const [lastFoto, setLastFoto] = useState(null);
  const hasCustomProfilePhoto = !!(profile.fotoLocal || foto);

  useEffect(() => {
    setNome(profile.nome || '');
    setProfissao(profile.profissao || '');
    setEmpresa(profile.empresa || '');
    setCnpj(profile.cnpj || '');
    setTelefone(profile.telefone || '');
    setEmail(profile.email || user?.email || '');
    const addr = pickEmpresaEnderecoFromProfile(profile);
    setInstagram(addr.instagram);
    setEnderecoRua(addr.endereco_rua);
    setEnderecoNumero(addr.endereco_numero);
    setEnderecoComplemento(addr.endereco_complemento);
    setEnderecoBairro(addr.endereco_bairro);
    setEnderecoCidade(addr.endereco_cidade);
    setEnderecoEstado(addr.endereco_estado);
    setEnderecoCep(addr.endereco_cep);
    setFoto(profile.foto || null);
  }, [
    profile,
    user?.email,
  ]);

  useEffect(() => {
    getLastFoto().then((v) => setLastFoto(v || null));
  }, [profile.foto, getLastFoto]);

  const inputStyle = [ps.input, { borderColor: colors.border, color: colors.text }];

  const handleSalvar = async () => {
    const payload = {
      nome: nome.trim(),
      profissao: profissao.trim(),
      telefone: telefone.trim(),
      email: email.trim(),
      foto,
    };
    if (showEmpresaFeatures) {
      Object.assign(payload, {
        empresa: empresa.trim(),
        cnpj: cnpj.trim(),
        instagram: instagram.trim(),
        endereco_rua: enderecoRua.trim(),
        endereco_numero: enderecoNumero.trim(),
        endereco_complemento: enderecoComplemento.trim(),
        endereco_bairro: enderecoBairro.trim(),
        endereco_cidade: enderecoCidade.trim(),
        endereco_estado: enderecoEstado.trim().toUpperCase(),
        endereco_cep: enderecoCep.trim(),
        endereco: buildEnderecoCompleto({
          endereco_rua: enderecoRua.trim(),
          endereco_numero: enderecoNumero.trim(),
          endereco_complemento: enderecoComplemento.trim(),
          endereco_bairro: enderecoBairro.trim(),
          endereco_cidade: enderecoCidade.trim(),
          endereco_estado: enderecoEstado.trim(),
          endereco_cep: enderecoCep.trim(),
          endereco: profile.endereco,
        }),
      });
    }
    try {
      await updateProfile(payload);
      Alert.alert('Salvo', 'Perfil atualizado com sucesso!');
    } catch (e) {
      const msg = e?.message || '';
      const hint = msg.includes('column') || msg.includes('cnpj') || msg.includes('endereco')
        ? '\n\nExecute no Supabase o arquivo supabase-profiles-empresa-dados.sql para habilitar os campos da empresa.'
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
          <Field label="Nome" colors={colors}>
            <TextInput style={inputStyle} placeholder="Seu nome" value={nome} onChangeText={setNome} placeholderTextColor={colors.textSecondary} />
          </Field>
          <Field label="Profissão" colors={colors}>
            <TextInput style={inputStyle} placeholder="Sua profissão" value={profissao} onChangeText={setProfissao} placeholderTextColor={colors.textSecondary} />
          </Field>
          <Field label="Celular" colors={colors}>
            <TextInput style={inputStyle} placeholder="(00) 00000-0000" value={telefone} onChangeText={setTelefone} placeholderTextColor={colors.textSecondary} keyboardType="phone-pad" />
          </Field>
          <Field label="E-mail (contato / relatórios)" colors={colors}>
            <TextInput style={inputStyle} placeholder="E-mail para contato" value={email} onChangeText={setEmail} placeholderTextColor={colors.textSecondary} keyboardType="email-address" autoCapitalize="none" />
          </Field>

          {showEmpresaFeatures ? (
            <>
              <Text style={[ps.sectionTitle, { color: colors.text }]}>Dados da empresa</Text>
              <Text style={[ps.sectionHint, { color: colors.textSecondary }]}>
                Usados em comprovantes, cupom não fiscal, ordem de serviço, orçamentos e relatórios.
              </Text>
              <Field label="Razão social / nome fantasia" colors={colors}>
                <TextInput style={inputStyle} placeholder="Nome da empresa" value={empresa} onChangeText={setEmpresa} placeholderTextColor={colors.textSecondary} />
              </Field>
              <Field label="CNPJ" colors={colors}>
                <TextInput style={inputStyle} placeholder="00.000.000/0000-00" value={cnpj} onChangeText={setCnpj} placeholderTextColor={colors.textSecondary} keyboardType="numeric" />
              </Field>
              <Field label="Instagram" colors={colors}>
                <TextInput style={inputStyle} placeholder="@usuario ou link" value={instagram} onChangeText={setInstagram} placeholderTextColor={colors.textSecondary} autoCapitalize="none" />
              </Field>

              <Text style={[ps.sectionTitle, { color: colors.text, marginTop: 8 }]}>Endereço</Text>
              <Field label="Rua / logradouro" colors={colors}>
                <TextInput style={inputStyle} placeholder="Rua, avenida..." value={enderecoRua} onChangeText={setEnderecoRua} placeholderTextColor={colors.textSecondary} />
              </Field>
              <View style={ps.row}>
                <View style={ps.inputHalf}>
                  <Field label="Número" colors={colors}>
                    <TextInput style={inputStyle} placeholder="123" value={enderecoNumero} onChangeText={setEnderecoNumero} placeholderTextColor={colors.textSecondary} />
                  </Field>
                </View>
                <View style={ps.inputHalf}>
                  <Field label="Complemento" colors={colors}>
                    <TextInput style={inputStyle} placeholder="Sala, loja..." value={enderecoComplemento} onChangeText={setEnderecoComplemento} placeholderTextColor={colors.textSecondary} />
                  </Field>
                </View>
              </View>
              <Field label="Bairro" colors={colors}>
                <TextInput style={inputStyle} placeholder="Bairro" value={enderecoBairro} onChangeText={setEnderecoBairro} placeholderTextColor={colors.textSecondary} />
              </Field>
              <View style={ps.row}>
                <View style={[ps.inputHalf, { flex: 2 }]}>
                  <Field label="Cidade" colors={colors}>
                    <TextInput style={inputStyle} placeholder="Cidade" value={enderecoCidade} onChangeText={setEnderecoCidade} placeholderTextColor={colors.textSecondary} />
                  </Field>
                </View>
                <View style={ps.inputHalf}>
                  <Field label="Estado (UF)" colors={colors}>
                    <TextInput style={inputStyle} placeholder="SP" value={enderecoEstado} onChangeText={setEnderecoEstado} placeholderTextColor={colors.textSecondary} autoCapitalize="characters" maxLength={2} />
                  </Field>
                </View>
              </View>
              <Field label="CEP" colors={colors}>
                <TextInput style={inputStyle} placeholder="00000-000" value={enderecoCep} onChangeText={setEnderecoCep} placeholderTextColor={colors.textSecondary} keyboardType="numeric" />
              </Field>
            </>
          ) : null}

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
