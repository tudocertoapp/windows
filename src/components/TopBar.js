import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, AppState, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMenu } from '../contexts/MenuContext';
import { useProfile } from '../contexts/ProfileContext';
import { getGreeting, getFinancePromptByTime } from '../utils/quotes';
import { AppIcon } from './AppIcon';
import { playTapSound } from '../utils/sounds';
import { useIsDesktopLayout, scaleWebDesktop } from '../utils/platformLayout';
import { getWebDesktopGridButtonMetrics, VIEW_MODE_TOGGLE_TOP_GAP } from './ViewModeToggle';
import { KeyboardShortcutsToggle } from './KeyboardShortcutsToggle';
import { DockHeaderCue } from './DockHeaderCue';
import { WEB_DESKTOP_RAIL_WIDTH, WEB_DESKTOP_RAIL_VIEWPORT_MARGIN } from './navigation/RightSideTabBar';

/** Padding direito da coluna da rail no AppNavigator — centraliza o botão na faixa da tabbar. */
const WEB_DESKTOP_RAIL_SCREEN_PAD_RIGHT = 16;
const WEB_DESKTOP_ORGANIZE_BTN = 40;
const WEB_DESKTOP_RAIL_BTN_GAP = 8;

// Cache da frase: muda só 1x por dia ou quando o usuário sai e volta ao app
let headerPromptCache = { prompt: null, dateKey: null };
let cameFromBackground = false;

/** Mesma frase do dia que o TopBar usa (sincroniza cache). Útil se precisar da mesma string fora do cabeçalho. */
export function getStableHomePrompt() {
  const today = new Date().toDateString();
  if (headerPromptCache.dateKey === today && headerPromptCache.prompt) {
    return headerPromptCache.prompt;
  }
  const p = getFinancePromptByTime();
  headerPromptCache = { prompt: p, dateKey: today };
  return p;
}

const logoImage = require('../../assets/logo.png');

export const topBarStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: 'visible',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  logoCircle: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  logoImage: { width: 36, height: 36 },
  logoText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '700' },
  menuBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});

const styles = topBarStyles;

export function TopBar({
  title,
  colors,
  useLogoImage,
  onOrganize,
  editMode,
  hideOrganize,
  onManageCards,
  onCalculadora,
  onChat,
  onWhatsApp,
  extendToTop = true,
  hideMenu,
  hideLogoIcon,
  inlineToggle,
  /** Data longa (ex.: TERÇA-FEIRA, 24 DE MARÇO) — cabeçalho compacto. */
  headerDate,
  /** Se true, data + frase financeira no cabeçalho (Início, Dinheiro, Meus gastos, WhatsApp e CRM, Agenda). */
  deferFinancePrompt,
}) {
  const { openMenu, openPerfil } = useMenu();
  const { profile } = useProfile();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const isDesktopLayout = useIsDesktopLayout();
  const isHome = title === 'Início' || useLogoImage;
  const isWeb = Platform.OS === 'web';
  const isWebDesktop = isWeb && isDesktopLayout;
  const { width: winWidth } = useWindowDimensions();
  const gridMetrics = getWebDesktopGridButtonMetrics(winWidth, isWebDesktop);
  const inlineToggleWrapStyle = isWebDesktop
    ? {
        width: gridMetrics.trackW,
        marginRight: -(scaleWebDesktop(16, true) - gridMetrics.desktopPagePad),
        position: 'relative',
        flexShrink: 0,
        overflow: 'visible',
      }
    : null;
  const showSlideMenu = !hideMenu;
  const [clockNow, setClockNow] = useState(() => new Date());
  // Foto de perfil no cabeçalho também no web desktop (Início).
  const showHomeAvatar = isHome;
  const appStateRef = useRef(AppState.currentState);
  const [homePrompt, setHomePrompt] = useState(() => {
    const today = new Date().toDateString();
    if (headerPromptCache.dateKey === today && headerPromptCache.prompt) {
      return headerPromptCache.prompt;
    }
    const p = getFinancePromptByTime();
    headerPromptCache = { prompt: p, dateKey: today };
    return p;
  });

  useEffect(() => {
    if (!isWebDesktop) return undefined;
    const t = setInterval(() => setClockNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [isWebDesktop]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        cameFromBackground = true;
      }
      appStateRef.current = nextState;
    });
    return () => sub?.remove?.();
  }, []);

  useEffect(() => {
    if (isHome && isFocused) {
      const today = new Date().toDateString();
      const shouldRefresh = headerPromptCache.dateKey !== today || cameFromBackground;
      if (shouldRefresh) {
        cameFromBackground = false;
        const p = getFinancePromptByTime();
        headerPromptCache = { prompt: p, dateKey: today };
        setHomePrompt(p);
      } else if (headerPromptCache.prompt) {
        setHomePrompt(headerPromptCache.prompt);
      }
    }
  }, [isHome, isFocused]);

  const menuButton = showSlideMenu ? (
    <TouchableOpacity
      style={{ padding: 8, backgroundColor: 'transparent' }}
      onPress={() => { playTapSound(); openMenu?.(); }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel="Menu"
    >
      <Ionicons name="menu" size={24} color={colors.textSecondary} />
    </TouchableOpacity>
  ) : null;

  /** Web desktop: frase financeira no cabeçalho (mesmo layout para Início, Dinheiro, Meus gastos, WhatsApp/CRM, Agenda). */
  const unifiedDeferTitles =
    title === 'Início' ||
    title === 'Dinheiro' ||
    title === 'Meus gastos' ||
    title === 'Dock' ||
    title === 'WhatsApp e CRM' ||
    title === 'Agenda';
  const homeDesktopDefer = isWebDesktop && deferFinancePrompt && unifiedDeferTitles;
  const showPromptOutsideHeader = !isWebDesktop && deferFinancePrompt && unifiedDeferTitles;
  const showInlineToggleBottomRow = isWebDesktop && !!inlineToggle;
  const stickyHeaderWithToggle = isWebDesktop && showInlineToggleBottomRow && Platform.OS === 'web';
  const stickyHeaderStyle = stickyHeaderWithToggle
    ? ({
        position: 'sticky',
        top: 0,
        zIndex: 100,
        overflow: 'visible',
      })
    : null;
  const hasCustomProfilePhoto = !!(profile?.fotoLocal || profile?.foto);

  const homeTrailingActions = (
    <>
      <KeyboardShortcutsToggle />
      {!isWebDesktop && onWhatsApp ? (
        <TouchableOpacity
          style={{ padding: 8, backgroundColor: 'transparent' }}
          onPress={() => { playTapSound(); onWhatsApp(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="logo-whatsapp" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
      {!isWebDesktop && onChat ? (
        <TouchableOpacity
          style={{ padding: 8, backgroundColor: 'transparent' }}
          onPress={() => { playTapSound(); onChat(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AppIcon name="chatbubbles-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
      {onCalculadora && !isWebDesktop ? (
        <TouchableOpacity
          style={{ padding: 8, backgroundColor: 'transparent' }}
          onPress={() => { playTapSound(); onCalculadora(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AppIcon name="calculator-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
      {isWebDesktop && onManageCards ? (
        <TouchableOpacity
          style={{ padding: 8, backgroundColor: 'transparent' }}
          onPress={() => { playTapSound(); onManageCards(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Ocultar ou acrescentar cards"
        >
          <Ionicons name="layers-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
      {isWebDesktop && !hideOrganize && onOrganize ? (
        <TouchableOpacity
          style={{ padding: 8, backgroundColor: 'transparent' }}
          onPress={() => { playTapSound(); onOrganize?.(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={editMode ? 'Sair do modo organizar' : 'Organizar cards'}
        >
          <AppIcon name="grid-outline" size={22} color={editMode ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
      {!isWebDesktop && onManageCards ? (
        <TouchableOpacity
          style={{ padding: 8, backgroundColor: 'transparent' }}
          onPress={() => { playTapSound(); onManageCards(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AppIcon name="grid-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : !isWebDesktop && !hideOrganize && onOrganize ? (
        <TouchableOpacity style={{ padding: 8 }} onPress={() => { playTapSound(); onOrganize?.(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <AppIcon name="grid-outline" size={24} color={editMode ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </>
  );

  const clockLabel = clockNow.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const Bar = homeDesktopDefer ? (
    <View style={[topBarStyles.bar, { backgroundColor: colors.bg, paddingHorizontal: scaleWebDesktop(16, true), paddingVertical: scaleWebDesktop(8, true), overflow: 'visible', alignItems: 'center', minHeight: 108 }]}>
      <View style={{ flex: 1.25, minWidth: 280, flexDirection: 'row', alignItems: 'center', gap: 8, overflow: 'visible' }}>
        {menuButton ? <View>{menuButton}</View> : null}
        <View style={{ flex: 1, minWidth: 0 }} pointerEvents="box-none">
          <DockHeaderCue colors={colors} compact />
        </View>
      </View>
      <View
        style={{
          flex: 1,
          minWidth: 180,
          paddingHorizontal: scaleWebDesktop(8, true),
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => { playTapSound(); openPerfil?.(); }}
          style={{ alignItems: 'center' }}
          accessibilityLabel="Tudo Certo"
        >
          <Image source={logoImage} style={{ width: 42, height: 42 }} resizeMode="contain" />
          <Text style={{ color: colors.textSecondary, fontSize: scaleWebDesktop(12, true), fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
            {getGreeting()}, {profile?.nome || 'você'}!
          </Text>
          <Text style={{ color: colors.text, fontSize: scaleWebDesktop(20, true), fontWeight: '800', letterSpacing: 0.4, lineHeight: 24 }}>
            {clockLabel}
          </Text>
          {headerDate ? (
            <Text
              style={{ color: colors.textSecondary, fontSize: scaleWebDesktop(10, true), fontWeight: '700', letterSpacing: 0.4, marginTop: 2 }}
              numberOfLines={1}
            >
              {headerDate}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
        {showHomeAvatar ? (
          <TouchableOpacity onPress={() => { playTapSound(); openPerfil?.(); }} style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000' }}>
            <Image
              source={hasCustomProfilePhoto ? { uri: profile.fotoLocal || profile.foto } : logoImage}
              style={{ width: 40, height: 40, borderRadius: 20 }}
              resizeMode={hasCustomProfilePhoto ? 'cover' : 'contain'}
            />
          </TouchableOpacity>
        ) : null}
        {homeTrailingActions}
        {!showInlineToggleBottomRow && inlineToggle ? (
          <View style={inlineToggleWrapStyle}>
            {/* Guias invisíveis de início/fim para manter alinhamento horizontal estável. */}
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, opacity: 0 }} />
            <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 1, opacity: 0 }} />
            {inlineToggle}
          </View>
        ) : null}
      </View>
    </View>
  ) : (
    <View style={[topBarStyles.bar, { backgroundColor: colors.bg, paddingHorizontal: isWebDesktop ? scaleWebDesktop(16, true) : 16, paddingVertical: isWebDesktop ? scaleWebDesktop(10, true) : 12 }]}>
      {!isWebDesktop && menuButton ? <View style={{ marginRight: 6 }}>{menuButton}</View> : null}
      {isWebDesktop && menuButton ? <View style={{ marginRight: 4 }}>{menuButton}</View> : null}
      <View style={[styles.logoRow, { flex: 1 }]}>
        {isHome ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            {showHomeAvatar && (
              <TouchableOpacity onPress={() => { playTapSound(); openPerfil?.(); }} style={{ width: 52, height: 52, borderRadius: 26, overflow: 'hidden', backgroundColor: '#000' }}>
                <Image
                  source={hasCustomProfilePhoto ? { uri: profile.fotoLocal || profile.foto } : logoImage}
                  style={{ width: 52, height: 52, borderRadius: 26 }}
                  resizeMode={hasCustomProfilePhoto ? 'cover' : 'contain'}
                />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1, minWidth: 0, paddingRight: 6, justifyContent: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                {getGreeting()}, {profile?.nome || 'você'}!
              </Text>
              {deferFinancePrompt && headerDate ? (
                <>
                  <Text
                    style={{ color: colors.text, fontSize: isWebDesktop ? scaleWebDesktop(10, true) : 11, fontWeight: '700', letterSpacing: 0.4, marginTop: 4, lineHeight: 14 }}
                    numberOfLines={2}
                  >
                    {headerDate}
                  </Text>
                  {isWebDesktop && unifiedDeferTitles ? (
                    <DockHeaderCue colors={colors} compact />
                  ) : null}
                </>
              ) : !deferFinancePrompt ? (
                <DockHeaderCue colors={colors} compact />
              ) : null}
            </View>
          </View>
        ) : (
          <>
            {!hideLogoIcon && (
              <Image source={logoImage} style={styles.logoImage} resizeMode="contain" />
            )}
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          </>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {homeTrailingActions}
        {!showInlineToggleBottomRow && inlineToggle ? (
          <View style={inlineToggleWrapStyle}>
            {/* Guias invisíveis de início/fim para manter alinhamento horizontal estável. */}
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, opacity: 0 }} />
            <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 1, opacity: 0 }} />
            {inlineToggle}
          </View>
        ) : null}
      </View>
    </View>
  );

  const showDesktopRightRail = isWebDesktop;
  const railFixedRight = showDesktopRightRail
    ? WEB_DESKTOP_RAIL_VIEWPORT_MARGIN + WEB_DESKTOP_RAIL_SCREEN_PAD_RIGHT + (WEB_DESKTOP_RAIL_WIDTH - WEB_DESKTOP_ORGANIZE_BTN) / 2
    : 16;
  const railBaseTop = insets.top + scaleWebDesktop(10, true) + 8;
  const showCardsRail = false;
  const showOrganizeRail = false;
  const cardsRailTop = showCardsRail ? railBaseTop : null;
  const organizeRailTop = showOrganizeRail
    ? railBaseTop + (showCardsRail ? WEB_DESKTOP_ORGANIZE_BTN + WEB_DESKTOP_RAIL_BTN_GAP : 0)
    : null;

  const railBtnStyle = (top) => ({
    position: 'fixed',
    top,
    right: railFixedRight,
    width: WEB_DESKTOP_ORGANIZE_BTN,
    height: WEB_DESKTOP_ORGANIZE_BTN,
    borderRadius: WEB_DESKTOP_ORGANIZE_BTN / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    zIndex: 2000,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  });

  const manageCardsRailButton =
    showCardsRail && cardsRailTop != null ? (
      <TouchableOpacity
        onPress={() => {
          playTapSound();
          onManageCards?.();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Gerenciar cards do Início"
        style={railBtnStyle(cardsRailTop)}
      >
        <Ionicons name="layers-outline" size={22} color={colors.textSecondary} />
      </TouchableOpacity>
    ) : null;

  const organizeRailButton =
    showOrganizeRail && organizeRailTop != null ? (
      <TouchableOpacity
        onPress={() => {
          playTapSound();
          onOrganize?.();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel={editMode ? 'Sair do modo organizar' : 'Organizar cards'}
        style={railBtnStyle(organizeRailTop)}
      >
        <AppIcon name="grid-outline" size={22} color={editMode ? colors.primary : colors.textSecondary} />
      </TouchableOpacity>
    ) : null;

  if (extendToTop) {
    return (
      <>
        {manageCardsRailButton}
        {organizeRailButton}
        <View style={[{ paddingTop: insets.top, overflow: 'visible' }, stickyHeaderStyle]}>
          <View style={{ backgroundColor: colors.bg, position: 'relative', zIndex: 30 }}>{Bar}</View>
          {showInlineToggleBottomRow ? (
            <View
              style={{
                paddingHorizontal: scaleWebDesktop(10, true),
                paddingBottom: 0,
                paddingTop: 0,
                overflow: 'visible',
                position: 'relative',
                zIndex: 20,
                marginTop: scaleWebDesktop(VIEW_MODE_TOGGLE_TOP_GAP, true),
                alignItems: 'stretch',
              }}
            >
              {inlineToggle}
            </View>
          ) : null}
          {showPromptOutsideHeader ? (
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <DockHeaderCue colors={colors} compact />
            </View>
          ) : null}
        </View>
      </>
    );
  }
  return (
    <>
      {manageCardsRailButton}
      {organizeRailButton}
      <View style={[{ overflow: 'visible' }, stickyHeaderStyle]}>
        <View style={{ backgroundColor: colors.bg, position: 'relative', zIndex: 30 }}>{Bar}</View>
        {showInlineToggleBottomRow ? (
          <View
            style={{
              paddingHorizontal: scaleWebDesktop(10, true),
              paddingBottom: 0,
              paddingTop: 0,
              overflow: 'visible',
              position: 'relative',
              zIndex: 20,
              marginTop: scaleWebDesktop(VIEW_MODE_TOGGLE_TOP_GAP, true),
              alignItems: 'stretch',
            }}
          >
            {inlineToggle}
          </View>
        ) : null}
      </View>
      {showPromptOutsideHeader ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8, backgroundColor: colors.bg }}>
          <DockHeaderCue colors={colors} compact />
        </View>
      ) : null}
    </>
  );
}
