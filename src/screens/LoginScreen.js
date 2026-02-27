import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const logoImage = require('../../assets/logo.png');

export function LoginScreen() {
  const { colors } = useTheme();
  const { signIn, signUp, signInWithGoogle, enterAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      Alert.alert('Erro', err.message || 'Não foi possível entrar com Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Informe o e-mail.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password, { nome: nome.trim() || email.split('@')[0] });
        Alert.alert('Sucesso', 'Conta criada! Verifique seu e-mail para confirmar.');
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Não foi possível entrar. Verifique e-mail e senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.logoRow}>
          <Image source={logoImage} style={s.logo} resizeMode="contain" />
          <Text style={[s.title, { color: colors.text }]}>Tudo Certo</Text>
        </View>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          {isSignUp ? 'Crie sua conta' : 'Entre com seu e-mail'}
        </Text>

        {isSignUp && (
          <TextInput
            style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Nome"
            placeholderTextColor={colors.textSecondary}
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
          />
        )}
        <TextInput
          style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="E-mail"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="Senha (mín. 6 caracteres)"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[s.btn, { backgroundColor: colors.primary }]}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnText}>{isSignUp ? 'Criar conta' : 'Entrar'}</Text>
          )}
        </TouchableOpacity>

        <View style={s.divider}>
          <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[s.dividerText, { color: colors.textSecondary }]}>ou</Text>
          <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <TouchableOpacity
          style={[s.googleBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          <Ionicons name="logo-google" size={22} color="#4285F4" />
          <Text style={[s.googleBtnText, { color: colors.text }]}>Entrar com Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.guestBtn} onPress={enterAsGuest} disabled={loading}>
          <Text style={[s.guestBtnText, { color: colors.textSecondary }]}>Entrar sem login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.switchBtn}
          onPress={() => setIsSignUp(!isSignUp)}
          disabled={loading}
        >
          <Text style={[s.switchText, { color: colors.primary }]}>
            {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Criar'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 80 },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 },
  logo: { width: 56, height: 56 },
  title: { fontSize: 32, fontWeight: '800' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 32, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  switchBtn: { alignItems: 'center', paddingVertical: 8 },
  switchText: { fontSize: 15, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
  },
  googleBtnText: { fontSize: 16, fontWeight: '600' },
  guestBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  guestBtnText: { fontSize: 15, textDecorationLine: 'underline' },
});
