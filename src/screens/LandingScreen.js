import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { playTapSound } from '../utils/sounds';
import { useIsDesktopLayout } from '../utils/platformLayout';

/** Logomarca completa (texto + ícone), igual às outras páginas. */
const brandLogo = require('../../assets/logo-pages.png');
const heroImage = require('../../assets/landing-desktop-hq-preview.png');

/** Gradiente: mais escuro em baixo para leitura do bloco no rodapé (mobile). */
const GRADIENT_COLORS = ['rgba(0,0,0,0.32)', 'rgba(0,0,0,0.42)', 'rgba(0,0,0,0.68)'];
const GRADIENT_LOCATIONS = [0, 0.5, 1];

/**
 * Altura aproximada do bloco no Login (mobile compact) entre o subtítulo e o botão Entrar:
 * Google + OU + rótulo/e-mail + linha senha + campo senha (+ margens).
 * Com ScrollView centrado, um View antes do CTA só desloca o botão metade da própria altura — usamos 2× esse valor.
 */
const LOGIN_MOBILE_STACK_BEFORE_ENTRAR_PX = 268;
const LANDING_CTA_ALIGNMENT_SPACER = LOGIN_MOBILE_STACK_BEFORE_ENTRAR_PX * 2;

/**
 * Login web desktop: espaço entre subtítulo e Entrar (Google + OU + campos), menos o bloco
 * de texto extra na Começar (headline + descrição vs slogan + Bem-vindo). Com ScrollView
 * centrado, altura efetiva = 2× este valor — afinado para alinhar ao Entrar.
 */
const LOGIN_DESKTOP_STACK_BEFORE_ENTRAR_PX = 108;
const LANDING_CTA_ALIGNMENT_SPACER_DESKTOP = LOGIN_DESKTOP_STACK_BEFORE_ENTRAR_PX * 2;

const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.55)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 10,
};

export function LandingScreen({ onStart }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const isWebDesktop = Platform.OS === 'web' && useIsDesktopLayout();
  const isMobileLike = !isWebDesktop;

  /** Igual ao Login mobile: paddingHorizontal efetivo 20 no scroll. */
  const padHMobile = 20;

  const type = useMemo(() => {
    const headline = Math.min(30, Math.max(22, Math.round(winW * 0.065)));
    const desc = Math.min(17, Math.max(14, Math.round(winW * 0.038)));
    return { headline, desc };
  }, [winW]);

  /** Mesmas dimensões da logomarca em LoginScreen (logo-pages.png, proporção ~3,35:1). */
  const brandLogoStyle = useMemo(() => {
    if (isWebDesktop) {
      return { width: 353, height: 106, marginBottom: 4 };
    }
    const w = Math.min(300, Math.max(240, winW * 0.82));
    return { width: w, height: Math.round(w / 3.35), marginBottom: 4 };
  }, [isWebDesktop, winW]);

  return (
    <View style={s.root}>
      <ImageBackground
        source={heroImage}
        style={s.fullBleed}
        imageStyle={s.heroImageStyle}
        resizeMode="cover"
        accessibilityLabel="Pessoa organizando a rotina no celular"
      >
        <LinearGradient
          colors={GRADIENT_COLORS}
          locations={GRADIENT_LOCATIONS}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
          <ScrollView
            style={s.scroll}
            contentContainerStyle={[
              s.scrollInner,
              isWebDesktop && s.scrollContentDesktop,
              {
                paddingHorizontal: isWebDesktop ? undefined : padHMobile,
                paddingTop: isWebDesktop ? undefined : 16,
                paddingBottom: isWebDesktop
                  ? Math.max(56, (insets.bottom || 0) + 40)
                  : Math.max(24, (insets.bottom || 0) + 20),
                minHeight: Math.max(winH - ((insets.top || 0) + (insets.bottom || 0)), 0),
                justifyContent: 'center',
                /** Web desktop: igual LoginScreen (coluna alinhada à esquerda dentro do bloco centrado). */
                alignItems: isWebDesktop ? 'flex-start' : 'center',
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces
          >
            <View style={[s.heroContent, isWebDesktop && s.heroContentDesktop, isMobileLike && s.heroContentMobile]}>
              <View
                style={[
                  s.brandMark,
                  isWebDesktop && s.brandMarkDesktop,
                  isMobileLike && s.brandMarkMobile,
                ]}
              >
                <Image
                  source={brandLogo}
                  style={brandLogoStyle}
                  resizeMode="contain"
                  accessibilityLabel="Tudo Certo"
                />
              </View>

              <Text
                style={[
                  s.headline,
                  TEXT_SHADOW,
                  isMobileLike && s.headlineMobile,
                  { fontSize: isWebDesktop ? 22 : type.headline, lineHeight: (isWebDesktop ? 22 : type.headline) + 8 },
                ]}
              >
                <Text style={s.textWhite}>Sua vida, </Text>
                <Text style={[s.headlineAccent, { color: colors.primary }]}>organizada.</Text>
              </Text>

              <View style={[s.descriptionBlock, isMobileLike && s.descriptionBlockMobile]}>
                <Text
                  style={[
                    s.description,
                    TEXT_SHADOW,
                    isMobileLike && s.descriptionMobile,
                    { fontSize: isWebDesktop ? 14 : type.desc, lineHeight: (isWebDesktop ? 14 : type.desc) + 8 },
                  ]}
                >
                  Pessoal ou empresa:
                </Text>
                <Text
                  style={[
                    s.description,
                    s.descriptionSecondLine,
                    TEXT_SHADOW,
                    isMobileLike && s.descriptionMobile,
                    { fontSize: isWebDesktop ? 14 : type.desc, lineHeight: (isWebDesktop ? 14 : type.desc) + 8 },
                  ]}
                >
                  Agenda e finanças de um jeito simples para ficar tudo certo.
                </Text>
              </View>

              {isMobileLike ? (
                <View
                  style={s.ctaVerticalAlignSpacer}
                  pointerEvents="none"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              ) : isWebDesktop ? (
                <View
                  style={s.ctaVerticalAlignSpacerDesktop}
                  pointerEvents="none"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              ) : null}

              <TouchableOpacity
                style={[
                  s.ctaBtn,
                  isWebDesktop && s.ctaBtnDesktop,
                  isMobileLike && s.ctaBtnMobile,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => {
                  playTapSound();
                  onStart?.();
                }}
                activeOpacity={0.85}
              >
                <Text style={[s.ctaText, isWebDesktop && s.ctaTextDesktop]}>Vamos começar</Text>
                <Ionicons name="arrow-forward" size={isWebDesktop ? 18 : 20} color="#fff" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  fullBleed: {
    flex: 1,
    width: '100%',
    minHeight: '100%',
  },
  heroImageStyle: {
    width: '100%',
    height: '100%',
  },
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1, backgroundColor: 'transparent' },
  scrollInner: {
    flexGrow: 1,
  },
  /** Igual LoginScreen.scrollContentDesktop: coluna centrada na viewport (web desktop). */
  scrollContentDesktop: {
    paddingHorizontal: 14,
    paddingTop: 6,
    maxWidth: 353,
    width: '100%',
    alignSelf: 'center',
  },

  /** Sem fundo: só texto e botão sobre a foto (web + mobile nativo). */
  heroContent: {
    maxWidth: 440,
    width: '100%',
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingRight: 8,
  },
  /** Largura herdada do scroll (353px); só ajuste vertical. */
  heroContentDesktop: {
    maxWidth: 353,
    width: '100%',
    paddingVertical: 6,
    paddingRight: 0,
  },
  heroContentMobile: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    maxWidth: 400,
  },

  /** Espaçamentos iguais a logoSection no LoginScreen */
  brandMark: {
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
    maxWidth: '100%',
  },
  brandMarkDesktop: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 4,
  },
  brandMarkMobile: {
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 34,
    marginBottom: 12,
    textAlign: 'left',
  },
  headlineMobile: {
    textAlign: 'center',
  },
  textWhite: { color: '#fff' },
  headlineAccent: { fontWeight: '800' },
  descriptionBlock: {
    marginBottom: 22,
    alignSelf: 'stretch',
  },
  descriptionBlockMobile: {
    alignSelf: 'stretch',
    width: '100%',
  },
  description: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
  },
  descriptionMobile: {
    textAlign: 'center',
  },
  descriptionSecondLine: {
    marginTop: 6,
  },
  /** Ver constante LANDING_CTA_ALIGNMENT_SPACER (alinhamento ao Entrar no login mobile). */
  ctaVerticalAlignSpacer: {
    height: LANDING_CTA_ALIGNMENT_SPACER,
    width: '100%',
    maxWidth: 400,
  },
  ctaVerticalAlignSpacerDesktop: {
    height: LANDING_CTA_ALIGNMENT_SPACER_DESKTOP,
    width: '100%',
    alignSelf: 'stretch',
  },
  /** btnPrimary + btnPrimaryCompact / btnPrimaryDesktop do LoginScreen */
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: 400,
  },
  ctaBtnMobile: {
    alignSelf: 'center',
  },
  ctaBtnDesktop: {
    borderRadius: 7,
    paddingVertical: 28,
    paddingHorizontal: 36,
    minHeight: 64,
    marginTop: 3,
    marginBottom: 6,
    maxWidth: 353,
    width: '100%',
    alignSelf: 'stretch',
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  ctaTextDesktop: { fontSize: 15, fontWeight: '700' },
});
