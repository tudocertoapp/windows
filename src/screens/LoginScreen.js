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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GoogleLogo } from '../components/GoogleLogo';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { playTapSound } from '../utils/sounds';

const logoImage = require('../../assets/logo.png');

export function LoginScreen() {
  const { colors } = useTheme();
  const { signIn, signUp, signInWithGoogle, enterAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nome, setNome] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleGoogleLogin = async () => {
    playTapSound();
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
    if (isSignUp) {
      if (password !== confirmPassword) {
        Alert.alert('Erro', 'As senhas não conferem.');
        return;
      }
    }
    playTapSound();
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password, {
          nome: nome.trim() || email.split('@')[0],
        });
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

  const handleForgotPassword = () => {
    playTapSound();
    Alert.alert('Recuperar senha', 'Em breve você poderá recuperar sua senha por e-mail.');
  };

  const inputStyle = [s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }];

  if (isSignUp) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => {
              playTapSound();
              setIsSignUp(false);
            }}
            style={s.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Criar conta</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[s.instruction, { color: colors.textSecondary }]}>
            Preencha seus dados para começar.
          </Text>

          <Text style={[s.label, { color: colors.text }]}>NOME COMPLETO</Text>
          <TextInput
            style={inputStyle}
            placeholder="Seu nome completo"
            placeholderTextColor={colors.textSecondary}
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
          />

          <Text style={[s.label, { color: colors.text }]}>E-MAIL</Text>
          <TextInput
            style={inputStyle}
            placeholder="exemplo@tudocerto.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[s.label, { color: colors.text }]}>SENHA</Text>
          <Text style={[s.labelHint, { color: colors.textSecondary }]}>Min. 6 caracteres</Text>
          <View style={[s.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[s.inputInner, { color: colors.text }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={s.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[s.label, { color: colors.text }]}>CONFIRMAR SENHA</Text>
          <View style={[s.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[s.inputInner, { color: colors.text }]}
              placeholder="Digite a senha de novo"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              style={s.eyeBtn}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.btnPrimary, { backgroundColor: colors.primary }]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnPrimaryText}>Criar conta</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.switchBtn}
            onPress={() => {
              playTapSound();
              setIsSignUp(false);
            }}
            disabled={loading}
          >
            <Text style={[s.switchText, { color: colors.textSecondary }]}>Já tem conta? </Text>
            <Text style={[s.switchText, { color: colors.primary, fontWeight: '700' }]}>Entrar</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={s.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.logoSection}>
            <Image source={logoImage} style={s.logo} resizeMode="contain" />
            <Text style={[s.brand, { color: colors.primary }]}>TUDO CERTO</Text>
          </View>

          <Text style={[s.slogan, { color: colors.textSecondary }]}>
            Organize sua vida do seu jeito.
          </Text>

          <Text style={[s.welcome, { color: colors.text }]}>Bem-vindo</Text>
          <Text style={[s.subtitle, { color: colors.text }]}>Acesse sua conta</Text>

          <TouchableOpacity
            style={[s.googleBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <GoogleLogo size={22} />
            <Text style={[s.googleBtnText, { color: colors.text }]}>Entrar com Google</Text>
          </TouchableOpacity>

          <View style={s.divider}>
            <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[s.dividerText, { color: colors.textSecondary }]}>OU</Text>
            <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Text style={[s.fallbackHint, { color: colors.textSecondary }]}>
            Se o Google falhar, use e-mail e senha abaixo.
          </Text>

          <Text style={[s.label, { color: colors.text }]}>E-MAIL</Text>
          <TextInput
            style={inputStyle}
            placeholder="exemplo@tudocerto.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={s.passwordRow}>
            <Text style={[s.label, { color: colors.text }]}>SENHA</Text>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={[s.forgotLink, { color: colors.primary }]}>Esqueci a senha</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={inputStyle}
            placeholder="••••••••"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[s.btnPrimary, { backgroundColor: colors.primary }]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnPrimaryText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.guestBtn} onPress={enterAsGuest} disabled={loading}>
            <Text style={[s.guestBtnText, { color: colors.textSecondary }]}>Entrar sem login</Text>
          </TouchableOpacity>

          <View style={s.registerRow}>
            <Text style={[s.registerText, { color: colors.textSecondary }]}>Ainda não tem conta? </Text>
            <TouchableOpacity
              onPress={() => {
                playTapSound();
                setIsSignUp(true);
              }}
              disabled={loading}
            >
              <Text style={[s.registerLink, { color: colors.primary }]}>Cadastrar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  logoSection: { alignItems: 'center', marginTop: 20, marginBottom: 12 },
  logo: { width: 64, height: 64, marginBottom: 12 },
  brand: { fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },
  slogan: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  welcome: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 16, marginBottom: 28, opacity: 0.9 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  labelHint: { fontSize: 11, marginBottom: 6, opacity: 0.8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  inputNoMargin: { marginBottom: 0 },
  inputInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  eyeBtn: { padding: 14 },
  passwordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  forgotLink: { fontSize: 14, fontWeight: '600' },
  btnPrimary: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
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
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '600' },
  fallbackHint: { fontSize: 13, marginBottom: 16 },
  guestBtn: { alignItems: 'center', paddingVertical: 12 },
  guestBtnText: { fontSize: 15 },
  registerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  registerText: { fontSize: 15 },
  registerLink: { fontSize: 15, fontWeight: '700' },
  switchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  switchText: { fontSize: 15 },
  instruction: { fontSize: 15, marginBottom: 24 },
});
