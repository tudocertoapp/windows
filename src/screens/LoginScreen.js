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
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GoogleLogo } from '../components/GoogleLogo';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { playTapSound } from '../utils/sounds';
import { useIsDesktopLayout } from '../utils/platformLayout';
import { formatAuthErrorMessage } from '../utils/authErrors';
import { LinearGradient } from 'expo-linear-gradient';

const logoImage = require('../../assets/logo-pages.png');
/** Placeholder da senha (evita caracteres corrompidos se o arquivo nao for UTF-8). */
const PASSWORD_PLACEHOLDER = '\u2022'.repeat(8);
const heroImage = require('../../assets/Generated_image.png');

/** Web: Alert.alert por vezes não aparece; garantimos mensagem visível. */
function notifyAuth(title, message, buttons) {
  const body = String(message || '').trim();
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(body ? `${title}\n\n${body}` : title);
    const ok = buttons?.find((b) => (b.text || '').toLowerCase() === 'ok' || (b.text || '').toLowerCase() === 'entendi');
    ok?.onPress?.();
    return;
  }
  if (buttons && buttons.length) Alert.alert(title, message, buttons);
  else Alert.alert(title, message);
}

export function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInWithGoogle, resetPasswordForEmail } = useAuth();
  const isWebDesktop = Platform.OS === 'web' && useIsDesktopLayout();
  const isMobileLike = !isWebDesktop;
  /** Mesma foto do desktop (mulher / notebook); evita “duas imagens” no mobile. */
  const heroSource = heroImage;
  const { width: winW, height: winH } = useWindowDimensions();
  const compactAuth = isMobileLike;
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
      notifyAuth('Erro', formatAuthErrorMessage(err, { isSignUp: false }));
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email.trim()) {
      notifyAuth('Atenção', 'Informe o e-mail.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      notifyAuth('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (isSignUp) {
      if (password !== confirmPassword) {
        notifyAuth('Atenção', 'As senhas não conferem.');
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
        notifyAuth(
          'Conta criada',
          'Se o projeto exigir confirmação por e-mail, abra a caixa de entrada (e o spam) e clique no link. Depois use «Entrar».\n\nSe não houver confirmação, você já pode entrar com e-mail e senha.'
        );
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      notifyAuth('Não foi possível salvar', formatAuthErrorMessage(err, { isSignUp }));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    playTapSound();
    if (!email.trim()) {
      notifyAuth(
        'E-mail necessário',
        'Digite o e-mail da sua conta no campo acima e toque novamente em «Esqueci a senha» para receber o link de redefinição.'
      );
      return;
    }
    setLoading(true);
    try {
      await resetPasswordForEmail(email.trim());
      notifyAuth(
        'E-mail enviado',
        'Se existir conta com este e-mail, você receberá um link para redefinir a senha. Verifique também o spam.'
      );
    } catch (err) {
      notifyAuth('Erro', formatAuthErrorMessage(err, { isSignUp: false }));
    } finally {
      setLoading(false);
    }
  };

  const dw = isWebDesktop;
  const inputStyle = [
    s.input,
    dw && s.inputDesktop,
    compactAuth && s.inputCompact,
    { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
  ];
  const scrollContentStyle = [
    s.scrollContent,
    dw && s.scrollContentDesktop,
    compactAuth && s.scrollContentCompact,
    {
      flexGrow: 1,
      minHeight: Math.max(winH - ((insets.top || 0) + (insets.bottom || 0)), 0),
      paddingLeft: dw ? 17 : 20,
      paddingRight: dw ? 17 : 20,
      paddingTop: compactAuth ? 16 : undefined,
      paddingBottom: dw
        ? Math.max(compactAuth ? 24 : 56, (insets.bottom || 0) + (compactAuth ? 16 : 40))
        : Math.max(24, (insets.bottom || 0) + 20),
      /** Mobile: mesmo eixo do desktop (conteúdo centrado), não colado no rodapé. */
      justifyContent: 'center',
      alignItems: compactAuth ? 'center' : 'flex-start',
    },
  ];
  const eyeSize = compactAuth ? 22 : dw ? 13 : 15;
  const desktopButtonStyle = dw ? [s.actionButtonDesktop, s.actionButtonSizeDesktop] : null;
  const desktopButtonTextStyle = dw ? s.actionButtonTextDesktop : null;

  if (isSignUp) {
    return (
      <ImageBackground
        source={heroSource}
        style={s.bgImage}
        imageStyle={s.bgImageStyle}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.58)']}
          style={StyleSheet.absoluteFill}
        />
      <SafeAreaView style={[s.container, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={s.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.header, dw && s.headerDesktop, compactAuth && s.headerCompact]}>
            <TouchableOpacity
              onPress={() => {
                playTapSound();
                setIsSignUp(false);
              }}
              style={s.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={dw ? 15 : 17} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.headerTitle, dw && s.headerTitleDesktop, compactAuth && s.headerTitleCompact, { color: colors.text }]}>Criar conta</Text>
            <View style={{ width: dw ? 22 : 28 }} />
          </View>

          <ScrollView
            style={s.scroll}
            contentContainerStyle={scrollContentStyle}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
          <Text style={[s.instruction, dw && s.instructionDesktop, compactAuth && s.instructionCompact, { color: colors.textSecondary }]}>
            Preencha seus dados para começar.
          </Text>

          <Text style={[s.label, dw && s.labelDesktop, compactAuth && s.labelCompact, { color: colors.text }]}>NOME COMPLETO</Text>
          <TextInput
            style={inputStyle}
            placeholder="Seu nome completo"
            placeholderTextColor={colors.textSecondary}
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
          />

          <Text style={[s.label, dw && s.labelDesktop, compactAuth && s.labelCompact, { color: colors.text }]}>E-MAIL</Text>
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

          <Text style={[s.label, dw && s.labelDesktop, compactAuth && s.labelCompact, { color: colors.text }]}>SENHA</Text>
          <Text style={[s.labelHint, compactAuth && s.labelHintCompact, { color: colors.textSecondary }]}>Min. 6 caracteres</Text>
          <View style={[s.inputWrap, dw && s.inputWrapDesktop, compactAuth && s.inputWrapCompact, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[s.inputInner, dw && s.inputInnerDesktop, compactAuth && s.inputInnerCompact, { color: colors.text }]}
              placeholder={PASSWORD_PLACEHOLDER}
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={[s.eyeBtn, dw && s.eyeBtnDesktop, compactAuth && s.eyeBtnCompact]}
              onPress={() => setShowPassword(!showPassword)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={eyeSize} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[s.label, dw && s.labelDesktop, compactAuth && s.labelCompact, { color: colors.text }]}>CONFIRMAR SENHA</Text>
          <View style={[s.inputWrap, dw && s.inputWrapDesktop, compactAuth && s.inputWrapCompact, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[s.inputInner, dw && s.inputInnerDesktop, compactAuth && s.inputInnerCompact, { color: colors.text }]}
              placeholder="Digite a senha de novo"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              style={[s.eyeBtn, dw && s.eyeBtnDesktop, compactAuth && s.eyeBtnCompact]}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              accessibilityRole="button"
              accessibilityLabel={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
            >
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={eyeSize} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.btnPrimary, dw && s.btnPrimaryDesktop, compactAuth && s.btnPrimaryCompact, desktopButtonStyle, { backgroundColor: colors.primary }]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[s.btnPrimaryText, dw && s.btnPrimaryTextDesktop, compactAuth && s.btnPrimaryTextCompact, desktopButtonTextStyle]}>Criar conta</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.switchBtn, dw && s.switchBtnDesktop, compactAuth && s.switchBtnCompact]}
            onPress={() => {
              playTapSound();
              setIsSignUp(false);
            }}
            disabled={loading}
          >
            <Text style={[s.switchText, dw && s.switchTextDesktop, { color: colors.textSecondary }]}>Já tem conta? </Text>
            <Text style={[s.switchText, dw && s.switchTextDesktop, compactAuth && s.switchTextCompact, { color: colors.primary, fontWeight: '700' }]}>Entrar</Text>
          </TouchableOpacity>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={heroSource}
      style={s.bgImage}
      imageStyle={s.bgImageStyle}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.58)']}
        style={StyleSheet.absoluteFill}
      />
    <SafeAreaView style={[s.container, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={s.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={scrollContentStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <View style={[s.logoSection, dw && s.logoSectionDesktop, compactAuth && s.logoSectionCompact]}>
            <Image
              source={logoImage}
              style={[
                s.logo,
                dw && s.logoDesktop,
                compactAuth && s.logoCompact,
                compactAuth && {
                  width: Math.min(300, Math.max(240, winW * 0.82)),
                  height: Math.round(Math.min(300, Math.max(240, winW * 0.82)) / 3.35),
                },
              ]}
              resizeMode="contain"
            />
          </View>

          <Text style={[s.slogan, dw && s.sloganDesktop, compactAuth && s.sloganCompact, { color: colors.textSecondary }]}>
            Organize sua vida do seu jeito.
          </Text>

          <Text style={[s.welcome, dw && s.welcomeDesktop, compactAuth && s.welcomeCompact, { color: colors.text }]}>Bem-vindo</Text>
          <Text style={[s.subtitle, dw && s.subtitleDesktop, compactAuth && s.subtitleCompact, { color: colors.text }]}>Acesse sua conta</Text>

          <TouchableOpacity
            style={[s.googleBtn, dw && s.googleBtnDesktop, compactAuth && s.googleBtnCompact, desktopButtonStyle, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <GoogleLogo size={dw ? 13 : 20} />
            <Text style={[s.googleBtnText, dw && s.googleBtnTextDesktop, compactAuth && s.googleBtnTextCompact, desktopButtonTextStyle, { color: colors.text }]}>Entrar com Google</Text>
          </TouchableOpacity>

          <View style={[s.divider, dw && s.dividerDesktop, compactAuth && s.dividerCompact]}>
            <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[s.dividerText, { color: colors.textSecondary }]}>OU</Text>
            <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Text style={[s.label, dw && s.labelDesktop, compactAuth && s.labelCompact, { color: colors.text }]}>E-MAIL</Text>
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

          <View style={[s.passwordRow, compactAuth && s.passwordRowCompact]}>
            <Text style={[s.label, dw && s.labelDesktop, compactAuth && s.labelCompact, { color: colors.text, marginBottom: 0 }]}>SENHA</Text>
            <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
              <Text style={[s.forgotLink, dw && s.forgotLinkDesktop, compactAuth && s.forgotLinkCompact, { color: colors.primary }]}>Esqueci a senha</Text>
            </TouchableOpacity>
          </View>
          <View
            style={[
              s.inputWrap,
              dw && s.inputWrapDesktop,
              compactAuth && s.inputWrapCompact,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TextInput
              style={[s.inputInner, dw && s.inputInnerDesktop, compactAuth && s.inputInnerCompact, { color: colors.text }]}
              placeholder={PASSWORD_PLACEHOLDER}
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete={Platform.OS === 'web' ? 'current-password' : 'password'}
              textContentType="password"
            />
            <TouchableOpacity
              style={[s.eyeBtn, dw && s.eyeBtnDesktop, compactAuth && s.eyeBtnCompact]}
              onPress={() => setShowPassword(!showPassword)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={eyeSize} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              s.btnPrimary,
              dw && s.btnPrimaryDesktop,
              compactAuth && s.btnPrimaryCompact,
              desktopButtonStyle,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={[
                  s.btnPrimaryText,
                  dw && s.btnPrimaryTextDesktop,
                  compactAuth && s.btnPrimaryTextCompact,
                  desktopButtonTextStyle,
                ]}
              >
                Entrar
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              s.btnSecondary,
              dw && s.btnSecondaryDesktop,
              compactAuth && s.btnSecondaryCompact,
              desktopButtonStyle,
              { borderColor: colors.primary, backgroundColor: 'transparent' },
              { marginBottom: 8 },
            ]}
            onPress={() => {
              playTapSound();
              setIsSignUp(true);
            }}
            disabled={loading}
          >
            <Text style={[s.btnSecondaryText, dw && s.btnSecondaryTextDesktop, compactAuth && s.btnSecondaryTextCompact, desktopButtonTextStyle, { color: colors.primary }]}>Criar conta</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  bgImage: { flex: 1, backgroundColor: '#0b1220' },
  bgImageStyle: { width: '100%', height: '100%' },
  keyboard: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  headerDesktop: { paddingVertical: 6, paddingHorizontal: 14 },
  headerCompact: { paddingVertical: 4, paddingHorizontal: 13 },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 13, fontWeight: '700' },
  headerTitleDesktop: { fontSize: 11 },
  headerTitleCompact: { fontSize: 11 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 17, paddingTop: 6 },
  scrollContentDesktop: {
    paddingHorizontal: 14,
    paddingTop: 6,
    maxWidth: 353,
    width: '100%',
    alignSelf: 'center',
  },
  scrollContentCompact: {
    paddingTop: 0,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  logoSection: { alignItems: 'center', alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  logoSectionDesktop: { marginTop: 4, marginBottom: 4 },
  logoSectionCompact: { alignItems: 'center', alignSelf: 'center', marginTop: 4, marginBottom: 12 },
  /** ~70% do bloco anterior (logo + formulario) */
  logo: { width: 265, height: 79, marginBottom: 6 },
  logoDesktop: { width: 353, height: 106, marginBottom: 4 },
  /** Largura/altura em mobile são refinadas no JSX com winW */
  logoCompact: { marginBottom: 4 },
  brand: { fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
  brandDesktop: { fontSize: 13 },
  brandCompact: { fontSize: 9 },
  slogan: { fontSize: 7, textAlign: 'center', width: '100%', marginBottom: 12 },
  sloganDesktop: { fontSize: 6, marginBottom: 7 },
  sloganCompact: { textAlign: 'center', fontSize: 14, marginBottom: 10, width: '100%', opacity: 0.92 },
  welcome: { fontSize: 14, fontWeight: '700', marginBottom: 2, width: '100%', textAlign: 'center' },
  welcomeDesktop: { fontSize: 11, marginBottom: 1 },
  welcomeCompact: { fontSize: 28, marginBottom: 4, textAlign: 'center', fontWeight: '700' },
  subtitle: { fontSize: 8, marginBottom: 14, opacity: 0.9, width: '100%', textAlign: 'center' },
  subtitleDesktop: { fontSize: 7, marginBottom: 8 },
  subtitleCompact: { fontSize: 16, marginBottom: 22, textAlign: 'center', opacity: 0.95 },
  label: {
    fontSize: 8,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.5,
    width: '100%',
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  labelDesktop: { fontSize: 8, marginBottom: 3 },
  labelCompact: { fontSize: 11, marginBottom: 4 },
  labelHint: { fontSize: 8, marginBottom: 4, opacity: 0.8 },
  labelHintCompact: { fontSize: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 11,
    marginBottom: 11,
    alignSelf: 'stretch',
    width: '100%',
  },
  inputDesktop: {
    width: '100%',
    paddingVertical: 7,
    paddingHorizontal: 8,
    fontSize: 10,
    borderRadius: 7,
    marginBottom: 8,
    minHeight: 29,
  },
  inputCompact: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    borderRadius: 10,
    marginBottom: 12,
    minHeight: 48,
  },
  inputInner: {
    flex: 1,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 11,
  },
  inputInnerDesktop: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 10,
    minHeight: 29,
  },
  inputInnerCompact: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 11,
    overflow: 'hidden',
    alignSelf: 'stretch',
    width: '100%',
  },
  inputWrapDesktop: { width: '100%', borderRadius: 7, marginBottom: 8, minHeight: 29 },
  inputWrapCompact: { borderRadius: 10, marginBottom: 12, minHeight: 48 },
  eyeBtn: { padding: 10 },
  eyeBtnDesktop: { padding: 7 },
  eyeBtnCompact: { padding: 12 },
  passwordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    width: '100%',
    alignSelf: 'stretch',
  },
  passwordRowCompact: { marginBottom: 6 },
  forgotLink: { fontSize: 10, fontWeight: '600' },
  forgotLinkDesktop: { fontSize: 8 },
  forgotLinkCompact: { fontSize: 13 },
  btnPrimary: {
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 7,
    alignSelf: 'stretch',
    width: '100%',
  },
  btnPrimaryDesktop: {
    paddingVertical: 8,
    borderRadius: 7,
    marginTop: 3,
    marginBottom: 6,
  },
  btnPrimaryCompact: {
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  btnPrimaryText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  btnPrimaryTextDesktop: { fontSize: 10 },
  btnPrimaryTextCompact: { fontSize: 17 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignSelf: 'stretch',
    width: '100%',
  },
  googleBtnDesktop: {
    paddingVertical: 7,
    borderRadius: 7,
    gap: 6,
  },
  googleBtnCompact: {
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  googleBtnText: { fontSize: 11, fontWeight: '600' },
  googleBtnTextDesktop: { fontSize: 10 },
  googleBtnTextCompact: { fontSize: 16 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 8,
    width: '100%',
    alignSelf: 'stretch',
  },
  dividerDesktop: { marginVertical: 10, gap: 7 },
  dividerCompact: { marginVertical: 14, gap: 8 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 8, fontWeight: '600' },
  btnSecondary: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 3,
    alignSelf: 'stretch',
    width: '100%',
  },
  btnSecondaryDesktop: {
    borderRadius: 7,
    paddingVertical: 8,
    marginTop: 1,
  },
  btnSecondaryCompact: {
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 0,
  },
  btnSecondaryText: { fontSize: 11, fontWeight: '700' },
  btnSecondaryTextDesktop: { fontSize: 10 },
  btnSecondaryTextCompact: { fontSize: 16 },
  actionButtonDesktop: {
    width: '100%',
    alignSelf: 'center',
  },
  actionButtonSizeDesktop: {
    minHeight: 31,
  },
  actionButtonTextDesktop: {
    fontSize: 10,
  },
  guestBtn: { alignItems: 'center', paddingVertical: 8 },
  guestBtnDesktop: { paddingVertical: 6 },
  guestBtnCompact: { alignItems: 'flex-start', paddingVertical: 4 },
  guestBtnText: { fontSize: 11 },
  guestBtnTextDesktop: { fontSize: 9 },
  guestBtnTextCompact: { fontSize: 8 },
  switchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 17 },
  switchBtnDesktop: { marginTop: 11 },
  switchBtnCompact: { justifyContent: 'center', marginTop: 8, width: '100%' },
  switchText: { fontSize: 11 },
  switchTextDesktop: { fontSize: 9 },
  switchTextCompact: { fontSize: 15 },
  instruction: { fontSize: 11, marginBottom: 17 },
  instructionDesktop: { fontSize: 10, marginBottom: 11 },
  instructionCompact: { fontSize: 15, marginBottom: 14, textAlign: 'center', width: '100%' },
});
