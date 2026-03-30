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

const logoImage = require('../../assets/logo.png');
const heroImage = require('../../assets/landing-hero.png');

/** Gradiente um pouco mais forte no topo para texto sem “card”, após subir o bloco. */
const GRADIENT_COLORS = ['rgba(0,0,0,0.32)', 'rgba(0,0,0,0.42)', 'rgba(0,0,0,0.68)'];
const GRADIENT_LOCATIONS = [0, 0.5, 1];

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

  const padBottom = Math.max(28, (insets.bottom || 0) + 20);
  const padTopSafe = Math.max(8, (insets.top || 0) + 4);
  /** Mobile (web estreito + nativo): conteúdo mais acima para não cortar o CTA. */
  const padTopMobile = Math.max(padTopSafe, 28, Math.round(winH * 0.06));
  const padH = Math.min(32, Math.max(20, winW * 0.06));
  const padHDesktop = Math.max(padH, 40);

  const type = useMemo(() => {
    const headline = Math.min(30, Math.max(22, Math.round(winW * 0.065)));
    const title = Math.min(26, Math.max(18, Math.round(winW * 0.052)));
    const desc = Math.min(17, Math.max(14, Math.round(winW * 0.038)));
    const logo = Math.min(96, Math.max(68, Math.round(winW * 0.2)));
    const logoDesktop = Math.min(88, Math.max(72, Math.round(winW * 0.06)));
    return { headline, title, desc, logo, logoDesktop };
  }, [winW]);

  return (
    <View style={s.root}>
      <ImageBackground
        source={heroImage}
        style={s.fullBleed}
        imageStyle={s.heroImageStyle}
        resizeMode="cover"
        accessibilityLabel="Pessoa organizando a rotina no celular"
      >
        <LinearGradient colors={GRADIENT_COLORS} locations={GRADIENT_LOCATIONS} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
          <ScrollView
            style={s.scroll}
            contentContainerStyle={[
              s.scrollInner,
              {
                paddingHorizontal: isWebDesktop ? padHDesktop : padH,
                paddingTop: isWebDesktop ? padTopSafe : padTopMobile,
                paddingBottom: padBottom,
                minHeight: Math.max(winH - ((insets.top || 0) + (insets.bottom || 0)), 380),
                justifyContent: isWebDesktop ? 'center' : 'flex-start',
                alignItems: 'flex-start',
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces
          >
            <View style={[s.heroContent, isWebDesktop && s.heroContentDesktop]}>
              <View style={s.logoRow}>
                <Image
                  source={logoImage}
                  style={{
                    width: isWebDesktop ? type.logoDesktop : type.logo,
                    height: isWebDesktop ? type.logoDesktop : type.logo,
                  }}
                  resizeMode="contain"
                />
                <Text style={[s.title, TEXT_SHADOW, { fontSize: isWebDesktop ? Math.min(24, type.title + 2) : type.title }]} numberOfLines={2}>
                  TUDO CERTO
                </Text>
              </View>

              <Text style={[s.headline, TEXT_SHADOW, { fontSize: isWebDesktop ? 22 : type.headline, lineHeight: (isWebDesktop ? 22 : type.headline) + 8 }]}>
                <Text style={s.textWhite}>Sua vida, </Text>
                <Text style={[s.headlineAccent, { color: colors.primary }]}>organizada.</Text>
              </Text>

              <View style={s.descriptionBlock}>
                <Text style={[s.description, TEXT_SHADOW, { fontSize: isWebDesktop ? 14 : type.desc, lineHeight: (isWebDesktop ? 14 : type.desc) + 8 }]}>
                  Pessoal ou empresa: agenda, tarefas e finanças juntos.
                </Text>
                <Text style={[s.description, s.descriptionSecondLine, TEXT_SHADOW, { fontSize: isWebDesktop ? 14 : type.desc, lineHeight: (isWebDesktop ? 14 : type.desc) + 8 }]}>
                  Pra ficar tudo certo.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  s.ctaBtn,
                  isWebDesktop && s.ctaBtnDesktop,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => {
                  playTapSound();
                  onStart?.();
                }}
                activeOpacity={0.85}
              >
                <Text style={[s.ctaText, isWebDesktop && s.ctaTextDesktop]}>Vamos começar</Text>
                <Ionicons name="arrow-forward" size={isWebDesktop ? 18 : 22} color="#fff" />
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

  /** Sem fundo: só texto e botão sobre a foto (web + mobile nativo). */
  heroContent: {
    maxWidth: 440,
    width: '100%',
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingRight: 8,
  },
  heroContentDesktop: {
    maxWidth: 480,
    paddingVertical: 12,
  },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
    maxWidth: '100%',
  },
  title: {
    flex: 1,
    flexShrink: 1,
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 34,
    marginBottom: 12,
    textAlign: 'left',
  },
  textWhite: { color: '#fff' },
  headlineAccent: { fontWeight: '800' },
  descriptionBlock: {
    marginBottom: 22,
    alignSelf: 'stretch',
  },
  description: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
  },
  descriptionSecondLine: {
    marginTop: 6,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignSelf: 'stretch',
    maxWidth: 400,
  },
  ctaBtnDesktop: {
    paddingVertical: 14,
    maxWidth: 260,
    alignSelf: 'flex-start',
    borderRadius: 999,
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  ctaTextDesktop: { fontSize: 15, fontWeight: '600' },
});
