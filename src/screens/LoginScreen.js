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
import { useIsDesktopLayout } from '../utils/platformLayout';
import { formatAuthErrorMessage } from '../utils/authErrors';

const logoImage = require('../../assets/logo.png');

export function LoginScreen() {
  const { colors } = useTheme();
  const { signIn, signUp, signInWithGoogle, enterAsGuest, resetPasswordForEmail } = useAuth();
  const isWebDesktop = Platform.OS === 'web' && useIsDesktopLayout();
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
      Alert.alert('Erro', formatAuthErrorMessage(err, { isSignUp }));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    playTapSound();
    if (!email.trim()) {
      Alert.alert(
        'E-mail necessário',
        'Digite o e-mail da sua conta no campo acima e toque novamente em «Esqueci a senha» para receber o link de redefinição.'
      );
      return;
    }
    setLoading(true);
    try {
      await resetPasswordForEmail(email.trim());
      Alert.alert(
        'E-mail enviado',
        'Se existir conta com este e-mail, você receberá um link para criar uma nova senha. Verifique também o spam.'
      );
    } catch (err) {
      Alert.alert('Erro', formatAuthErrorMessage(err, { isSignUp: false }));
    } finally {
      setLoading(false);
    }
  };

  const dw = isWebDesktop;
  const inputStyle = [
    s.input,
    dw && s.inputDesktop,
    { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
  ];
  const scrollContentStyle = [s.scrollContent, dw && s.scrollContentDesktop];
  const eyeSize = dw ? 18 : 22;

  if (isSignUp) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <View style={[s.header, dw && s.headerDesktop]}>
          <TouchableOpacity
            onPress={() => {
              playTapSound();
              setIsSignUp(false);
            }}
            style={s.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={dw ? 22 : 24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, dw && s.headerTitleDesktop, { color: colors.text }]}>Criar conta</Text>
          <View style={{ width: dw ? 32 : 40 }} />
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={scrollContentStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[s.instruction, dw && s.instructionDesktop, { color: colors.textSecondary }]}>
            Preencha seus dados para começar.
          </Text>

          <Text style={[s.label, dw && s.labelDesktop, { color: colors.text }]}>NOME COMPLETO</Text>
          <TextInput
            style={inputStyle}
            placeholder="Seu nome completo"
            placeholderTextColor={colors.textSecondary}
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
          />

          <Text style={[s.label, dw && s.labelDesktop, { color: colors.text }]}>E-MAIL</Text>
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

          <Text style={[s.label, dw && s.labelDesktop, { color: colors.text }]}>SENHA</Text>
          <Text style={[s.labelHint, { color: colors.textSecondary }]}>Min. 6 caracteres</Text>
          <View style={[s.inputWrap, dw && s.inputWrapDesktop, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[s.inputInner, dw && s.inputInnerDesktop, { color: colors.text }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={[s.eyeBtn, dw && s.eyeBtnDesktop]} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={eyeSize} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[s.label, dw && s.labelDesktop, { color: colors.text }]}>CONFIRMAR SENHA</Text>
          <View style={[s.inputWrap, dw && s.inputWrapDesktop, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[s.inputInner, dw && s.inputInnerDesktop, { color: colors.text }]}
              placeholder="Digite a senha de novo"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity style={[s.eyeBtn, dw && s.eyeBtnDesktop]} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={eyeSize} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.btnPrimary, dw && s.btnPrimaryDesktop, { backgroundColor: colors.primary }]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[s.btnPrimaryText, dw && s.btnPrimaryTextDesktop]}>Criar conta</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.switchBtn, dw && s.switchBtnDesktop]}
            onPress={() => {
              playTapSound();
              setIsSignUp(false);
            }}
            disabled={loading}
          >
            <Text style={[s.switchText, dw && s.switchTextDesktop, { color: colors.textSecondary }]}>Já tem conta? </Text>
            <Text style={[s.switchText, dw && s.switchTextDesktop, { color: colors.primary, fontWeight: '700' }]}>Entrar</Text>
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
          contentContainerStyle={scrollContentStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[s.logoSection, dw && s.logoSectionDesktop]}>
            <Image source={logoImage} style={[s.logo, dw && s.logoDesktop]} resizeMode="contain" />
            <Text style={[s.brand, dw && s.brandDesktop, { color: colors.primary }]}>TUDO CERTO</Text>
          </View>

          <Text style={[s.slogan, dw && s.sloganDesktop, { color: colors.textSecondary }]}>
            Organize sua vida do seu jeito.
          </Text>

          <Text style={[s.welcome, dw && s.welcomeDesktop, { color: colors.text }]}>Bem-vindo</Text>
          <Text style={[s.subtitle, dw && s.subtitleDesktop, { color: colors.text }]}>Acesse sua conta</Text>

          <TouchableOpacity
            style={[s.googleBtn, dw && s.googleBtnDesktop, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <GoogleLogo size={dw ? 18 : 22} />
            <Text style={[s.googleBtnText, dw && s.googleBtnTextDesktop, { color: colors.text }]}>Entrar com Google</Text>
          </TouchableOpacity>

          <View style={[s.divider, dw && s.dividerDesktop]}>
            <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[s.dividerText, { color: colors.textSecondary }]}>OU</Text>
            <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Text style={[s.fallbackHint, dw && s.fallbackHintDesktop, { color: colors.textSecondary }]}>
            Conta criada só com Google? Use o botão acima. E-mail e senha são para quem cadastrou senha neste app.
          </Text>

          <Text style={[s.label, dw && s.labelDesktop, { color: colors.text }]}>E-MAIL</Text>
          <TextInput
            style={inputStyle}
            placeholder="exemplo@tudocerto.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={Platform.OS === 'web' ? 'email' : 'off'}
            textContentType="emailAddress"
          />

          <View style={s.passwordRow}>
            <Text style={[s.label, dw && s.labelDesktop, { color: colors.text, marginBottom: 0 }]}>SENHA</Text>
            <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
              <Text style={[s.forgotLink, dw && s.forgotLinkDesktop, { color: colors.primary }]}>Esqueci a senha</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={inputStyle}
            placeholder="••••••••"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={Platform.OS === 'web' ? 'current-password' : 'password'}
            textContentType="password"
          />

          <TouchableOpacity
            style={[s.btnPrimary, dw && s.btnPrimaryDesktop, { backgroundColor: colors.primary }]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[s.btnPrimaryText, dw && s.btnPrimaryTextDesktop]}>Entrar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              s.btnSecondary,
              dw && s.btnSecondaryDesktop,
              { borderColor: colors.primary, backgroundColor: 'transparent' },
            ]}
            onPress={() => {
              playTapSound();
              setIsSignUp(true);
            }}
            disabled={loading}
          >
            <Text style={[s.btnSecondaryText, dw && s.btnSecondaryTextDesktop, { color: colors.primary }]}>Criar conta</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.guestBtn, dw && s.guestBtnDesktop]} onPress={enterAsGuest} disabled={loading}>
            <Text style={[s.guestBtnText, dw && s.guestBtnTextDesktop, { color: colors.textSecondary }]}>Entrar sem login</Text>
          </TouchableOpacity>
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
  headerDesktop: { paddingVertical: 8, paddingHorizontal: 20 },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerTitleDesktop: { fontSize: 16 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  scrollContentDesktop: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  logoSection: { alignItems: 'center', marginTop: 20, marginBottom: 12 },
  logoSectionDesktop: { marginTop: 8, marginBottom: 8 },
  logo: { width: 64, height: 64, marginBottom: 12 },
  logoDesktop: { width: 48, height: 48, marginBottom: 8 },
  brand: { fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },
  brandDesktop: { fontSize: 19 },
  slogan: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  sloganDesktop: { fontSize: 13, marginBottom: 14 },
  welcome: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  welcomeDesktop: { fontSize: 22, marginBottom: 2 },
  subtitle: { fontSize: 16, marginBottom: 28, opacity: 0.9 },
  subtitleDesktop: { fontSize: 14, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  labelDesktop: { fontSize: 11, marginBottom: 4 },
  labelHint: { fontSize: 11, marginBottom: 6, opacity: 0.8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  inputDesktop: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    borderRadius: 10,
    marginBottom: 12,
    minHeight: 42,
  },
  inputInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  inputInnerDesktop: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 42,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  inputWrapDesktop: { borderRadius: 10, marginBottom: 12, minHeight: 42 },
  eyeBtn: { padding: 14 },
  eyeBtnDesktop: { padding: 10 },
  passwordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  forgotLink: { fontSize: 14, fontWeight: '600' },
  forgotLinkDesktop: { fontSize: 12 },
  btnPrimary: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  btnPrimaryDesktop: {
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnPrimaryTextDesktop: { fontSize: 14 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
  },
  googleBtnDesktop: {
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  googleBtnText: { fontSize: 16, fontWeight: '600' },
  googleBtnTextDesktop: { fontSize: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerDesktop: { marginVertical: 14, gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '600' },
  fallbackHint: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
  fallbackHintDesktop: { fontSize: 12, marginBottom: 12, lineHeight: 16 },
  guestBtn: { alignItems: 'center', paddingVertical: 12 },
  guestBtnDesktop: { paddingVertical: 8 },
  guestBtnText: { fontSize: 15 },
  guestBtnTextDesktop: { fontSize: 13 },
  switchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  switchBtnDesktop: { marginTop: 16 },
  switchText: { fontSize: 15 },
  switchTextDesktop: { fontSize: 13 },
  instruction: { fontSize: 15, marginBottom: 24 },
  instructionDesktop: { fontSize: 14, marginBottom: 16 },
});
