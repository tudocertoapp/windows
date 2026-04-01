import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
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
import {
  AUTH_LOGO_SOURCE,
  AUTH_HERO_MOBILE,
  AUTH_HERO_MOBILE_IMAGE_STYLE,
  AUTH_DESKTOP_LOGO,
  AUTH_DESKTOP_PRIMARY_BUTTON,
  AUTH_DESKTOP_PRIMARY_TEXT,
  AUTH_DESKTOP_PRIMARY_TOP,
  AUTH_DESKTOP_LOGO_TOP,
  AUTH_LOGO_SECTION,
  AUTH_LOGO_SECTION_DESKTOP,
  getAuthMobileScrollPaddingTop,
  AUTH_MOBILE_LOGIN_CONTENT_EXTRA_TOP,
  AUTH_MOBILE_PRIMARY_BUTTONS_EXTRA_TOP,
  AUTH_MOBILE_FIXED_CTA_SCROLL_RESERVE_2,
  AUTH_MOBILE_FIXED_CTA_MAX_WIDTH,
} from '../shared/authUi';
import { AuthPrimaryButton } from '../shared/AuthPrimaryButton';
import { AuthLogoMobile } from '../shared/AuthLogoMobile';
import { AuthMobileFixedCtaBar } from '../shared/AuthMobileFixedCtaBar';

const logoImage = AUTH_LOGO_SOURCE;
/** Placeholder da senha (evita caracteres corrompidos se o arquivo nao for UTF-8). */
const PASSWORD_PLACEHOLDER = '\u2022'.repeat(8);
/** «Já tenho conta?» — U+00E1 explícito (evita mojibake no web; v. LandingScreen). */
const SIGNUP_ALREADY_ACCOUNT_PROMPT = ['J', String.fromCodePoint(0x00e1), ' tenho conta? '].join('');
/** Título da página de cadastro (imperativo de *cadastrar*: cadastre-se). */
const SIGNUP_PAGE_TITLE = 'Cadastre-se';
const heroDesktop = require('../../assets/landing-desktop-hq-preview.png');

/** Web: Alert.alert por vezes nÃ£o aparece; garantimos mensagem visÃ­vel. */
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

export function LoginScreen({ initialSignUp = false, onBackToLanding } = {}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInWithGoogle, resetPasswordForEmail } = useAuth();
  const isWebDesktop = Platform.OS === 'web' && useIsDesktopLayout();
  const isMobileLike = !isWebDesktop;
  const heroSource = isMobileLike ? AUTH_HERO_MOBILE : heroDesktop;
  const { width: winW, height: winH } = useWindowDimensions();
  const compactAuth = isMobileLike;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nome, setNome] = useState('');
  const [isSignUp, setIsSignUp] = useState(!!initialSignUp);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      playTapSound();
      if (isSignUp) setIsSignUp(false);
      else onBackToLanding?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSignUp, onBackToLanding]);

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
      notifyAuth('Aten\u00e7\u00e3o', 'Informe o e-mail.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      notifyAuth('Aten\u00e7\u00e3o', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (isSignUp) {
      if (password !== confirmPassword) {
        notifyAuth('Aten\u00e7\u00e3o', 'As senhas n\u00e3o conferem.');
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
          'Se o projeto exigir confirma\u00e7\u00e3o por e-mail, abra a caixa de entrada (e o spam) e clique no link. Depois use Entrar.\n\nSe n\u00e3o houver confirma\u00e7\u00e3o, voc\u00ea j\u00e1 pode entrar com e-mail e senha.'
        );
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      notifyAuth('N\u00e3o foi poss\u00edvel salvar', formatAuthErrorMessage(err, { isSignUp }));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    playTapSound();
    if (!email.trim()) {
      notifyAuth(
        'E-mail necess\u00e1rio',
        'Digite o e-mail da sua conta no campo acima e toque novamente em Esqueci a senha para receber o link de redefini\u00e7\u00e3o.'
      );
      return;
    }
    setLoading(true);
    try {
      await resetPasswordForEmail(email.trim());
      notifyAuth(
        'E-mail enviado',
        'Se existir conta com este e-mail, voc\u00ea receber\u00e1 um link para redefinir a senha. Verifique tamb\u00e9m o spam.'
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
      paddingLeft: dw ? 14 : 20,
      paddingRight: dw ? 14 : 20,
      paddingTop: compactAuth
        ? getAuthMobileScrollPaddingTop(winW) + AUTH_MOBILE_LOGIN_CONTENT_EXTRA_TOP
        : undefined,
      paddingBottom: dw
        ? Math.max(compactAuth ? 24 : 56, (insets.bottom || 0) + (compactAuth ? 16 : 40))
        : compactAuth && !isSignUp
          ? AUTH_MOBILE_FIXED_CTA_SCROLL_RESERVE_2 + Math.max(12, (insets.bottom || 0) + 8)
          : Math.max(24, (insets.bottom || 0) + 20),
      /** Mobile: logo no overlay; conteÃºdo comeÃ§a abaixo dela (igual web e nativo). */
      justifyContent: compactAuth ? 'flex-start' : 'center',
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
        imageStyle={[
          s.bgImageStyle,
          dw && s.bgImageDesktopMirrored,
          isMobileLike && AUTH_HERO_MOBILE_IMAGE_STYLE,
        ]}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.58)']}
          style={StyleSheet.absoluteFill}
        />
      <SafeAreaView style={[s.container, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={s.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity
            onPress={() => {
              playTapSound();
              setIsSignUp(false);
            }}
            style={[s.backBtn, s.backBtnFloating, dw && s.backBtnFloatingDesktop]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={dw ? 15 : 17} color={colors.text} />
          </TouchableOpacity>

          {compactAuth ? <AuthLogoMobile winW={winW} /> : null}

          <ScrollView
            style={s.scroll}
            contentContainerStyle={scrollContentStyle}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
          {dw ? (
            <View style={[s.logoSection, s.logoSectionDesktop, s.logoSectionDesktopFixedTop]}>
              <Image
                source={logoImage}
                style={[s.logo, s.logoDesktop]}
                resizeMode="contain"
              />
            </View>
          ) : null}

          <Text style={[s.signUpTitle, dw && s.signUpTitleDesktop, compactAuth && s.signUpTitleCompact, { color: '#fff' }]}>
            {SIGNUP_PAGE_TITLE}
          </Text>

          <Text style={[s.label, dw && s.labelDesktop, compactAuth && s.labelCompact, { color: '#fff' }]}>NOME COMPLETO</Text>
          <TextInput
            style={inputStyle}
            placeholder="Seu nome completo"
            placeholderTextColor={colors.textSecondary}
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
          />

          <Text style={[s.label, dw && s.labelDesktop, compactAuth && s.labelCompact, { color: '#fff' }]}>E-MAIL</Text>
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

          <Text style={[s.label, dw && s.labelDesktop, compactAuth && s.labelCompact, { color: '#fff' }]}>SENHA</Text>
          <Text style={[s.labelHint, compactAuth && s.labelHintCompact, { color: '#fff' }]}>Min. 6 caracteres</Text>
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

          <Text style={[s.label, dw && s.labelDesktop, compactAuth && s.labelCompact, { color: '#fff' }]}>CONFIRMAR SENHA</Text>
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
              accessibilityLabel={
                showConfirmPassword
                  ? 'Ocultar confirma\u00e7\u00e3o de senha'
                  : 'Mostrar confirma\u00e7\u00e3o de senha'
              }
            >
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={eyeSize} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <AuthPrimaryButton
            label="Criar conta"
            onPress={handleAuth}
            disabled={loading}
            loading={loading}
            desktopFixedTop={dw}
            marginTop={compactAuth ? 4 + AUTH_MOBILE_PRIMARY_BUTTONS_EXTRA_TOP : undefined}
          />

          <TouchableOpacity
            style={[
              s.switchBtn,
              dw && s.switchBtnDesktop,
              dw && s.switchBtnDesktopSignUp,
              compactAuth && s.switchBtnCompact,
            ]}
            onPress={() => {
              playTapSound();
              setIsSignUp(false);
            }}
            disabled={loading}
          >
            <Text style={[s.switchText, dw && s.switchTextDesktop, { color: '#fff' }]}>{SIGNUP_ALREADY_ACCOUNT_PROMPT}</Text>
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
      imageStyle={[
        s.bgImageStyle,
        dw && s.bgImageDesktopMirrored,
        isMobileLike && AUTH_HERO_MOBILE_IMAGE_STYLE,
      ]}
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
        {compactAuth ? <AuthLogoMobile winW={winW} /> : null}
        <ScrollView
          style={s.scroll}
          contentContainerStyle={scrollContentStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {dw ? (
            <View style={[s.logoSection, s.logoSectionDesktop, s.logoSectionDesktopFixedTop]}>
              <Image
                source={logoImage}
                style={[s.logo, s.logoDesktop]}
                resizeMode="contain"
              />
            </View>
          ) : null}

          <Text style={[s.welcome, dw && s.welcomeDesktop, compactAuth && s.welcomeCompact, { color: '#fff' }]}>Seja Bem-Vindo</Text>
          <Text style={[s.subtitle, dw && s.subtitleDesktop, compactAuth && s.subtitleCompact, { color: '#fff' }]}>Acesse sua conta</Text>

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
            <Text style={[s.dividerText, { color: '#fff' }]}>OU</Text>
            <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Text style={[s.label, dw && s.labelDesktop, compactAuth && s.labelCompact, { color: '#fff' }]}>E-MAIL</Text>
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
            <Text style={[s.label, dw && s.labelDesktop, compactAuth && s.labelCompact, { color: '#fff', marginBottom: 0 }]}>SENHA</Text>
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

          {dw ? (
            <>
              <AuthPrimaryButton
                label="Entrar"
                onPress={handleAuth}
                disabled={loading}
                loading={loading}
                desktopFixedTop
                marginTop={4}
              />
              <AuthPrimaryButton
                label="Criar conta"
                onPress={() => {
                  playTapSound();
                  setIsSignUp(true);
                }}
                disabled={loading}
                desktopFixedTop
                desktopStackOffset={44}
                marginBottom={8}
              />
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    {compactAuth ? (
      <AuthMobileFixedCtaBar insetsBottom={insets.bottom} isWebMobile={Platform.OS === 'web'}>
        <AuthPrimaryButton
          label="Entrar"
          onPress={handleAuth}
          disabled={loading}
          loading={loading}
          marginTop={0}
          marginBottom={8}
          containerStyle={{
            width: '100%',
            maxWidth: AUTH_MOBILE_FIXED_CTA_MAX_WIDTH,
            alignSelf: 'center',
          }}
        />
        <AuthPrimaryButton
          label="Criar conta"
          onPress={() => {
            playTapSound();
            setIsSignUp(true);
          }}
          disabled={loading}
          marginTop={0}
          marginBottom={0}
          containerStyle={{
            width: '100%',
            maxWidth: AUTH_MOBILE_FIXED_CTA_MAX_WIDTH,
            alignSelf: 'center',
          }}
        />
      </AuthMobileFixedCtaBar>
    ) : null}
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  bgImage: { flex: 1, backgroundColor: '#0b1220', overflow: 'hidden' },
  bgImageStyle: { width: '100%', height: '100%' },
  bgImageDesktopMirrored: { transform: [{ scaleX: -1 }] },
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
  backBtnFloating: {
    position: 'absolute',
    zIndex: 10,
    top: 14,
    left: 14,
  },
  backBtnFloatingDesktop: {
    top: 14,
    left: 14,
  },
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
    alignSelf: 'flex-end',
    marginRight: 36,
    transform: [{ translateX: -80 }],
  },
  scrollContentCompact: {
    paddingTop: 0,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  logoSection: { ...AUTH_LOGO_SECTION },
  logoSectionDesktop: { ...AUTH_LOGO_SECTION_DESKTOP },
  logoSectionDesktopFixedTop: {
    position: 'absolute',
    top: AUTH_DESKTOP_LOGO_TOP,
    left: 0,
    right: 0,
  },
  /** ~70% do bloco anterior (logo + formulario) */
  logo: { width: 265, height: 79, marginBottom: 6 },
  logoDesktop: { ...AUTH_DESKTOP_LOGO, marginBottom: 4 },
  brand: { fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
  brandDesktop: { fontSize: 13 },
  brandCompact: { fontSize: 9 },
  welcome: { fontSize: 19, fontWeight: '700', marginBottom: 2, width: '100%', textAlign: 'center' },
  welcomeDesktop: { fontSize: 14, marginBottom: 1 },
  /** Mobile / web mobile: título menor que no desktop. */
  welcomeCompact: { fontSize: 22, marginBottom: 4, textAlign: 'center', fontWeight: '700' },
  /** Login desktop e cadastro: mesmos fontSize que welcome/subtitle; compact alinhado a welcomeCompact. */
  signUpTitle: { fontSize: 19, fontWeight: '700', marginBottom: 4, width: '100%', textAlign: 'center' },
  signUpTitleDesktop: { fontSize: 14, marginBottom: 2 },
  signUpTitleCompact: { fontSize: 22, marginBottom: 6, textAlign: 'center', fontWeight: '700' },
  subtitle: { fontSize: 19, marginBottom: 14, opacity: 0.9, width: '100%', textAlign: 'center' },
  subtitleDesktop: { fontSize: 14, marginBottom: 8 },
  subtitleCompact: { fontSize: 22, marginBottom: 16, textAlign: 'center', opacity: 0.95 },
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
    minWidth: 0,
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
  inputWrapDesktop: { width: '100%', minWidth: 0, borderRadius: 7, marginBottom: 8, minHeight: 29 },
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
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 7,
    alignSelf: 'stretch',
    width: '100%',
  },
  btnPrimaryDesktop: { ...AUTH_DESKTOP_PRIMARY_BUTTON },
  btnPrimaryDesktopFixedTop: {
    position: 'absolute',
    top: AUTH_DESKTOP_PRIMARY_TOP,
    left: 14,
    right: 14,
  },
  btnPrimaryDesktopSecondFixedTop: {
    position: 'absolute',
    top: AUTH_DESKTOP_PRIMARY_TOP + 44,
    left: 14,
    right: 14,
  },
  btnPrimaryCompact: {
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
    marginBottom: 10,
  },
  btnPrimaryText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  btnPrimaryTextDesktop: { ...AUTH_DESKTOP_PRIMARY_TEXT },
  btnPrimaryTextCompact: { fontSize: 17 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignSelf: 'stretch',
    width: '100%',
  },
  googleBtnDesktop: {
    paddingVertical: 7,
    borderRadius: 9,
    gap: 6,
  },
  googleBtnCompact: {
    paddingVertical: 14,
    borderRadius: 14,
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
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 3,
    alignSelf: 'stretch',
    width: '100%',
  },
  btnSecondaryDesktop: {
    borderRadius: 9,
    paddingVertical: 8,
    marginTop: 1,
  },
  btnSecondaryDesktopFixedTop: {
    position: 'absolute',
    top: AUTH_DESKTOP_PRIMARY_TOP + 44,
    left: 0,
    right: 0,
  },
  btnSecondaryCompact: {
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 0,
  },
  btnSecondaryText: { fontSize: 11, fontWeight: '700' },
  btnSecondaryTextDesktop: { fontSize: 10 },
  btnSecondaryTextCompact: { fontSize: 16 },
  actionButtonDesktop: {
    width: '100%',
    maxWidth: 325,
    alignSelf: 'center',
  },
  actionButtonSizeDesktop: {
    minHeight: 29,
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
  switchBtnDesktopSignUp: {
    position: 'absolute',
    top: AUTH_DESKTOP_PRIMARY_TOP + 52,
    left: 0,
    right: 0,
    justifyContent: 'center',
  },
  switchBtnCompact: { justifyContent: 'center', marginTop: 8, width: '100%' },
  switchText: { fontSize: 11 },
  switchTextDesktop: { fontSize: 9 },
  switchTextCompact: { fontSize: 15 },
  instruction: { fontSize: 11, marginBottom: 17 },
  instructionDesktop: { fontSize: 10, marginBottom: 11 },
  instructionCompact: { fontSize: 15, marginBottom: 14, textAlign: 'center', width: '100%' },
});

