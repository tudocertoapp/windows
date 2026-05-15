import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getApiOrigin } from '../lib/subscription';

const s = StyleSheet.create({
  wrap: { flex: 1 },
  inner: { padding: 20, paddingBottom: 40, maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  sub: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 14 },
  btn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successBox: { padding: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 12 },
});

export function CadastroClientePublicoScreen({ ownerUserId: ownerUserIdProp }) {
  const { colors } = useTheme();
  const ownerUserId = useMemo(() => {
    if (ownerUserIdProp) return String(ownerUserIdProp).trim();
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('ref') || '';
    }
    return '';
  }, [ownerUserIdProp]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const apiBase = getApiOrigin();

  const handleSubmit = async () => {
    setError('');
    if (!ownerUserId) {
      setError('Link inválido. Peça um novo link à empresa.');
      return;
    }
    if (!name.trim()) {
      setError('Informe seu nome.');
      return;
    }
    if (!apiBase) {
      setError('Cadastro online indisponível no momento.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/clients/public-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: ownerUserId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          cpf: cpf.trim(),
          birthDate: birthDate.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Não foi possível enviar o cadastro.');
        return;
      }
      setDone(true);
    } catch (_) {
      setError('Erro de conexão. Verifique a internet e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (!ownerUserId) {
    return (
      <SafeAreaView style={[s.wrap, { backgroundColor: colors.bg }]}>
        <View style={[s.inner, s.successBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' }}>Link inválido</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
            Este link de cadastro não está correto. Solicite um novo link pelo WhatsApp.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (done) {
    return (
      <SafeAreaView style={[s.wrap, { backgroundColor: colors.bg }]}>
        <View style={[s.inner, s.successBox, { borderColor: colors.primary + '50', backgroundColor: colors.primaryRgba(0.08) }]}>
          <Ionicons name="checkmark-circle" size={56} color={colors.primary} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' }}>Cadastro enviado!</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
            Obrigado, {name.trim()}. A empresa já recebeu seus dados.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.wrap, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
          <Text style={[s.title, { color: colors.text }]}>Cadastro de cliente</Text>
          <Text style={[s.sub, { color: colors.textSecondary }]}>
            Preencha seus dados abaixo. Eles serão enviados com segurança para a empresa.
          </Text>
          {error ? (
            <Text style={{ color: '#ef4444', marginBottom: 12, fontSize: 14 }}>{error}</Text>
          ) : null}
          <Text style={[s.label, { color: colors.text }]}>Nome *</Text>
          <TextInput
            style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
            value={name}
            onChangeText={setName}
            placeholder="Seu nome completo"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={[s.label, { color: colors.text }]}>E-mail</Text>
          <TextInput
            style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="seu@email.com"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={[s.label, { color: colors.text }]}>Telefone / WhatsApp</Text>
          <TextInput
            style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="(00) 00000-0000"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={[s.label, { color: colors.text }]}>CPF</Text>
          <TextInput
            style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
            value={cpf}
            onChangeText={setCpf}
            keyboardType="numeric"
            placeholder="000.000.000-00"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={[s.label, { color: colors.text }]}>Data de nascimento</Text>
          <TextInput
            style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={[s.label, { color: colors.text }]}>Endereço</Text>
          <TextInput
            style={[s.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
            value={address}
            onChangeText={setAddress}
            placeholder="Rua, número, bairro, cidade"
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity
            style={[s.btn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>Enviar cadastro</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
