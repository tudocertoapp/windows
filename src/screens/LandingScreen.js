import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { playTapSound } from '../utils/sounds';
import { useIsDesktopLayout } from '../utils/platformLayout';
import {
  AUTH_LOGO_SOURCE,
  AUTH_HERO_MOBILE,
  AUTH_HERO_MOBILE_IMAGE_STYLE,
  AUTH_DESKTOP_LOGO,
  AUTH_DESKTOP_LOGO_TOP,
  AUTH_LOGO_SECTION,
  AUTH_LOGO_SECTION_DESKTOP,
  getAuthMobileLogo,
  getAuthMobileScrollPaddingTop,
  AUTH_MOBILE_LOGIN_CONTENT_EXTRA_TOP,
  AUTH_MOBILE_FIXED_CTA_SCROLL_RESERVE_1,
  AUTH_MOBILE_FIXED_CTA_MAX_WIDTH,
} from '../shared/authUi';
import { AuthPrimaryButton } from '../shared/AuthPrimaryButton';
import { AuthLogoMobile } from '../shared/AuthLogoMobile';
import { AuthMobileFixedCtaBar } from '../shared/AuthMobileFixedCtaBar';

/** Logomarca completa (texto + ÃƒÂ­cone), igual ÃƒÂ s outras pÃƒÂ¡ginas. */
const brandLogo = AUTH_LOGO_SOURCE;
const heroDesktop = require('../../assets/landing-desktop-hq-preview.png');

/** Gradiente: mais escuro em baixo para leitura do bloco no rodapÃƒÂ© (mobile). */
const GRADIENT_COLORS = ['rgba(0,0,0,0.32)', 'rgba(0,0,0,0.42)', 'rgba(0,0,0,0.68)'];
const GRADIENT_LOCATIONS = [0, 0.5, 1];

/**
 * Login web desktop: espaÃƒÂ§o entre subtÃƒÂ­tulo e Entrar (Google + OU + campos), menos o bloco
 * de texto extra na ComeÃƒÂ§ar (headline + descriÃƒÂ§ÃƒÂ£o vs slogan + Bem-vindo). Com ScrollView
 * centrado, altura efetiva = 2Ãƒâ€” este valor Ã¢â‚¬â€ afinado para alinhar ao Entrar.
 */
const LOGIN_DESKTOP_STACK_BEFORE_ENTRAR_PX = 108;
const LANDING_CTA_ALIGNMENT_SPACER_DESKTOP = LOGIN_DESKTOP_STACK_BEFORE_ENTRAR_PX * 2;

const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.55)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 10,
};

/** «Vamos começar» — U+00E7 explícito (evita mojibake no web). */
const LANDING_PRIMARY_CTA_LABEL = ['Vamos ', 'come', String.fromCodePoint(0x00e7), 'ar'].join('');

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

  /** Mesmas dimensÃƒÂµes da logomarca em LoginScreen (logo-pages.png, proporÃƒÂ§ÃƒÂ£o ~3,35:1). */
  const brandLogoStyle = useMemo(() => {
    if (isWebDesktop) {
      return { ...AUTH_DESKTOP_LOGO, marginBottom: 4 };
    }
    return { ...getAuthMobileLogo(winW), marginBottom: 4 };
  }, [isWebDesktop, winW]);

  const heroSource = isWebDesktop ? heroDesktop : AUTH_HERO_MOBILE;

  /** Altura mínima do conteúdo do scroll = viewport útil (para centrar texto entre logo e CTA). */
  const mobileScrollMinHeight = Math.max(
    winH - ((insets.top || 0) + (insets.bottom || 0)),
    0,
  );

  const landingCopy = (
    <View
      style={[
        s.descriptionBlock,
        isMobileLike && s.descriptionBlockMobile,
        isMobileLike && s.descriptionBlockMobileCentered,
      ]}
    >
      <Text
        style={[
          s.headline,
          isWebDesktop && s.headlineDesktopCentered,
          isWebDesktop && s.landingInfoDesktopOffset,
          TEXT_SHADOW,
          isMobileLike && s.headlineMobile,
          s.textWhite,
          { fontSize: isWebDesktop ? 22 : type.headline, lineHeight: (isWebDesktop ? 22 : type.headline) + 8 },
        ]}
      >
        <Text style={s.textWhite}>Pessoal ou </Text>
        <Text style={[s.headlineAccent, { color: colors.primary }]}>Empresa</Text>
        <Text style={s.textWhite}>:</Text>
      </Text>
      <Text
        style={[
          s.description,
          s.descriptionSecondLine,
          isWebDesktop && s.descriptionDesktopCentered,
          TEXT_SHADOW,
          isMobileLike && s.descriptionMobile,
          { fontSize: isWebDesktop ? 14 : type.desc, lineHeight: (isWebDesktop ? 14 : type.desc) + 8 },
        ]}
      >
        {'Agenda e finan\u00e7as de um jeito simples'}
        {'\n'}
        para ficar tudo certo.
      </Text>
    </View>
  );

  const fixedBtnStyle = { maxWidth: AUTH_MOBILE_FIXED_CTA_MAX_WIDTH, width: '100%', alignSelf: 'center' };

  /** Começar: texto do CTA; ação continua a abrir o ecrã de login (onStart). */
  const ctaEntrar = (
    <AuthPrimaryButton
      label={LANDING_PRIMARY_CTA_LABEL}
      onPress={() => {
        playTapSound();
        onStart?.();
      }}
      desktopFixedTop={isWebDesktop}
      marginTop={isMobileLike ? 0 : undefined}
      marginBottom={isMobileLike ? 0 : undefined}
      containerStyle={isMobileLike ? fixedBtnStyle : undefined}
    />
  );

  return (
    <View style={s.root}>
      <ImageBackground
        source={heroSource}
        style={s.fullBleed}
        imageStyle={[
          s.heroImageStyle,
          isWebDesktop && s.heroImageDesktopMirrored,
          isMobileLike && AUTH_HERO_MOBILE_IMAGE_STYLE,
        ]}
        resizeMode="cover"
        accessibilityLabel="Pessoa organizando a rotina no celular"
      >
        <LinearGradient
          colors={GRADIENT_COLORS}
          locations={GRADIENT_LOCATIONS}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
          {isMobileLike ? (
            <>
              <AuthLogoMobile winW={winW} />
              <ScrollView
                style={s.mobileBodyScroll}
                contentContainerStyle={[
                  {
                    flexGrow: 1,
                    minHeight: mobileScrollMinHeight,
                    paddingTop:
                      getAuthMobileScrollPaddingTop(winW) + AUTH_MOBILE_LOGIN_CONTENT_EXTRA_TOP,
                    paddingHorizontal: padHMobile,
                    paddingBottom:
                      AUTH_MOBILE_FIXED_CTA_SCROLL_RESERVE_1 +
                      Math.max(12, (insets.bottom || 0) + 8),
                    alignItems: 'center',
                  },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces
              >
                <View style={s.landingMobileCopyWrap}>{landingCopy}</View>
              </ScrollView>
            </>
          ) : (
            <ScrollView
              style={s.scroll}
              contentContainerStyle={[
                s.scrollInner,
                s.scrollContentDesktop,
                {
                  paddingBottom: Math.max(56, (insets.bottom || 0) + 40),
                  minHeight: Math.max(winH - ((insets.top || 0) + (insets.bottom || 0)), 0),
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces
            >
              <View style={[s.brandMark, s.brandMarkDesktop]}>
                <Image
                  source={brandLogo}
                  style={brandLogoStyle}
                  resizeMode="contain"
                  accessibilityLabel="Tudo Certo"
                />
              </View>
              {landingCopy}
              <View
                style={s.ctaVerticalAlignSpacerDesktop}
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
              {ctaEntrar}
            </ScrollView>
          )}
        </SafeAreaView>
        {isMobileLike ? (
          <AuthMobileFixedCtaBar insetsBottom={insets.bottom} isWebMobile={Platform.OS === 'web'}>
            {ctaEntrar}
          </AuthMobileFixedCtaBar>
        ) : null}
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
    overflow: 'hidden',
  },
  heroImageStyle: {
    width: '100%',
    height: '100%',
  },
  heroImageDesktopMirrored: {
    transform: [{ scaleX: -1 }],
  },
  safe: { flex: 1, backgroundColor: 'transparent' },
  /** Mobile: RN Web — flexBasis 0 evita ScrollView a empurrar o conteúdo para fora da vista. */
  mobileBodyScroll: {
    flex: 1,
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
    backgroundColor: 'transparent',
  },
  /** Ocupa o espaço entre paddingTop (logo) e paddingBottom (CTA fixo); centra o texto em altura. */
  landingMobileCopyWrap: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    justifyContent: 'center',
  },
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
    alignSelf: 'flex-end',
    marginRight: 36,
    transform: [{ translateX: -80 }],
  },

  /** Sem fundo: sÃƒÂ³ texto e botÃƒÂ£o sobre a foto (web + mobile nativo). */
  heroContent: {
    maxWidth: 440,
    width: '100%',
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingRight: 8,
  },
  /** Largura herdada do scroll (353px); sÃƒÂ³ ajuste vertical. */
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

  /** Desktop: logo no scroll com posiÃ§Ã£o fixa (igual Login). */
  brandMark: { ...AUTH_LOGO_SECTION, maxWidth: '100%' },
  brandMarkDesktop: {
    alignSelf: 'flex-start',
    ...AUTH_LOGO_SECTION_DESKTOP,
    position: 'absolute',
    top: AUTH_DESKTOP_LOGO_TOP,
    left: 0,
    right: 0,
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 34,
    marginBottom: 12,
    textAlign: 'left',
  },
  headlineDesktopCentered: {
    textAlign: 'center',
  },
  /** Offset desktop do bloco textual abaixo da logomarca. */
  landingInfoDesktopOffset: { marginTop: 230 },
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
  descriptionBlockMobileCentered: {
    marginBottom: 0,
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
  descriptionDesktopCentered: {
    textAlign: 'center',
  },
  descriptionSecondLine: {
    marginTop: 6,
  },
  ctaVerticalAlignSpacerDesktop: {
    height: LANDING_CTA_ALIGNMENT_SPACER_DESKTOP,
    width: '100%',
    alignSelf: 'stretch',
  },
});



