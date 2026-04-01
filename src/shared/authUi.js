import { Platform } from 'react-native';

export const AUTH_LOGO_SOURCE = require('../../assets/logo-pages.png');

/** Hero de fundo: mobile web e app nativo (Começar, Login, Criar conta). */
export const AUTH_HERO_MOBILE = require('../../assets/auth-hero-mobile.png');

/**
 * Enquadramento mobile: retrato centrado (hero partilhado Começar / Login / Criar conta).
 * Web: objectPosition centra o rosto; nativo: zoom leve + translate fino.
 */
export const AUTH_HERO_MOBILE_IMAGE_STYLE = Platform.select({
  web: {
    width: '100%',
    height: '100%',
    left: 0,
    top: 0,
    objectFit: 'cover',
    objectPosition: 'center center',
  },
  default: {
    width: '135%',
    height: '100%',
    left: 0,
    top: 0,
    transform: [{ translateX: -24 }],
  },
});

export const AUTH_DESKTOP_LOGO = {
  width: 353,
  height: 106,
};

export function getAuthMobileLogo(winW) {
  const w = Math.min(340, Math.max(260, Math.round(winW * 0.86)));
  return { width: w, height: Math.round(w / 3.35) };
}

export const AUTH_DESKTOP_PRIMARY_BUTTON = {
  borderRadius: 9,
  paddingVertical: 7,
  minHeight: 29,
  marginTop: 3,
  marginBottom: 6,
  width: '100%',
  maxWidth: 353,
  alignSelf: 'stretch',
};

export const AUTH_DESKTOP_PRIMARY_TEXT = {
  fontSize: 10,
  fontWeight: '700',
};

/** Mesma âncora visual do botão primário no desktop (Começar/Entrar). */
export const AUTH_DESKTOP_PRIMARY_TOP = 417;
/** Logomarca desktop: uma constante para Começar / Login / Criar conta. */
export const AUTH_DESKTOP_LOGO_TOP = 50;

/** Ajuste fino vertical da logomarca no mobile (px). */
export const AUTH_LOGO_MOBILE_TRANSLATE_Y = 0;

/**
 * Topo da logomarca no mobile (abaixo do safe area), igual em Começar / Login / Criar conta.
 */
export const AUTH_MOBILE_LOGO_TOP = 58;

/**
 * Empurra texto, formulários e botões no scroll para baixo sem alterar a logomarca (overlay).
 * Web mobile + app nativo.
 */
export const AUTH_MOBILE_BODY_SHIFT_Y = 30;

/**
 * Começar mobile: distância do botão ao fundo do ecrã (px).
 * Usar `bottom` em vez de translateY — mais fiável no React Native Web.
 */
export const AUTH_MOBILE_LANDING_CTA_BOTTOM_BASE = 32;

/** Reduz o `bottom` do CTA (desce o botão em direção ao fundo do ecrã). */
export const AUTH_MOBILE_LANDING_CTA_NUDGE_DOWN = 35;

/** Web mobile: valor extra somado ao bottom (sobe mais o botão). */
export const AUTH_MOBILE_LANDING_CTA_BOTTOM_WEB_EXTRA = 20;

/** Sobe o bloco fixo de CTAs em relação ao fundo (Começar + Login mobile; nativo e web). */
export const AUTH_MOBILE_FIXED_CTA_LIFT_PX = 20;

/**
 * `bottom` do bloco fixo (Começar + Login mobile): mesma fórmula em ambas as páginas.
 * @param {number} insetsBottom safe area inferior
 * @param {boolean} isWebMobile web em viewport mobile (não desktop)
 */
export function getAuthMobileFixedCtaBottom(insetsBottom, isWebMobile) {
  return (
    Math.max(
      Math.max(
        AUTH_MOBILE_LANDING_CTA_BOTTOM_BASE +
          (isWebMobile ? AUTH_MOBILE_LANDING_CTA_BOTTOM_WEB_EXTRA : 0),
        (insetsBottom || 0) + 10,
      ) - AUTH_MOBILE_LANDING_CTA_NUDGE_DOWN,
      6,
    ) + AUTH_MOBILE_FIXED_CTA_LIFT_PX
  );
}

/** `paddingBottom` no ScrollView para não esconder conteúdo atrás do CTA fixo (1 botão). */
export const AUTH_MOBILE_FIXED_CTA_SCROLL_RESERVE_1 = 108;

/** Dois botões primários empilhados (Entrar + Criar conta) no login. */
export const AUTH_MOBILE_FIXED_CTA_SCROLL_RESERVE_2 = 176;

/** Largura máxima dos botões no CTA fixo mobile (igual Login scroll). */
export const AUTH_MOBILE_FIXED_CTA_MAX_WIDTH = 400;

/**
 * Login mobile: desce todo o conteúdo do scroll abaixo da logo (px).
 */
export const AUTH_MOBILE_LOGIN_CONTENT_EXTRA_TOP = 75;

/**
 * Espaço extra acima do primeiro botão primário (Entrar / Criar conta no cadastro), mobile.
 * Soma-se ao marginTop compact (~4) no LoginScreen.
 */
export const AUTH_MOBILE_PRIMARY_BUTTONS_EXTRA_TOP = 15;

/** Overlay compartilhado: mesma posição em todas as telas de auth no mobile. */
export const AUTH_MOBILE_LOGO_OVERLAY = {
  position: 'absolute',
  top: AUTH_MOBILE_LOGO_TOP,
  left: 0,
  right: 0,
  alignItems: 'center',
  zIndex: 2,
  transform: [{ translateY: AUTH_LOGO_MOBILE_TRANSLATE_Y }],
};

/** Espaço que o scroll precisa reservar abaixo do safe area para não cobrir a logo. */
export function getAuthMobileScrollPaddingTop(winW, extraBelowLogo = 0) {
  const { height } = getAuthMobileLogo(winW);
  return AUTH_MOBILE_LOGO_TOP + height + 16 + AUTH_MOBILE_BODY_SHIFT_Y + extraBelowLogo;
}

/** Posição padrão da logomarca (aplicada em Começar e Login). */
export const AUTH_LOGO_SECTION = {
  alignItems: 'center',
  alignSelf: 'center',
  marginTop: 10,
  marginBottom: 6,
};

export const AUTH_LOGO_SECTION_DESKTOP = {
  marginTop: 4,
  marginBottom: 4,
};

/** Margens quando a logo ainda está no fluxo (só desktop no scroll); mobile usa overlay. */
export const AUTH_LOGO_SECTION_MOBILE = {
  marginTop: 4,
  marginBottom: 12,
  transform: [{ translateY: AUTH_LOGO_MOBILE_TRANSLATE_Y }],
};
