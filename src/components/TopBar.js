import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMenu } from '../contexts/MenuContext';
import { useProfile } from '../contexts/ProfileContext';
import { getGreeting, getFinancePromptByTime } from '../utils/quotes';
import { AppIcon } from './AppIcon';
import { playTapSound } from '../utils/sounds';

const logoImage = require('../../assets/logo.png');

export const topBarStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  logoCircle: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  logoImage: { width: 36, height: 36 },
  logoText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '700' },
  menuBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});

const styles = topBarStyles;

export function TopBar({ title, colors, useLogoImage, onOrganize, editMode, hideOrganize, onManageCards, onCalculadora, onChat, onWhatsApp, extendToTop = true, hideMenu, hideLogoIcon }) {
  const { openMenu, openPerfil } = useMenu();
  const { profile } = useProfile();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const isHome = title === 'Início' || useLogoImage;
  const [homePrompt, setHomePrompt] = useState(() => getFinancePromptByTime());

  useEffect(() => {
    if (isHome && isFocused) {
      setHomePrompt(getFinancePromptByTime());
    }
  }, [isHome, isFocused]);

  const Bar = (
    <View style={[topBarStyles.bar, { backgroundColor: colors.bg }]}>
      <View style={[styles.logoRow, { flex: 1 }]}>
        {isHome ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <TouchableOpacity onPress={() => { playTapSound(); openPerfil?.(); }} style={{ width: 52, height: 52, borderRadius: 26, overflow: 'hidden' }}>
              <Image
                source={(profile?.fotoLocal || profile?.foto) ? { uri: profile.fotoLocal || profile.foto } : logoImage}
                style={{ width: 52, height: 52, borderRadius: 26 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                {getGreeting()}, {profile?.nome || 'você'}!
              </Text>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', flexShrink: 1, lineHeight: 18 }} numberOfLines={2}>
                {homePrompt}
              </Text>
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
        {onWhatsApp ? (
          <TouchableOpacity
            style={{ padding: 8, backgroundColor: 'transparent' }}
            onPress={() => { playTapSound(); onWhatsApp(); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="logo-whatsapp" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : onChat ? (
          <TouchableOpacity
            style={{ padding: 8, backgroundColor: 'transparent' }}
            onPress={() => { playTapSound(); onChat(); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppIcon name="chatbubbles-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
        {onCalculadora ? (
          <TouchableOpacity
            style={{ padding: 8, backgroundColor: 'transparent' }}
            onPress={() => { playTapSound(); onCalculadora(); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppIcon name="calculator-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
        {onManageCards ? (
          <TouchableOpacity
            style={{ padding: 8, backgroundColor: 'transparent' }}
            onPress={() => { playTapSound(); onManageCards(); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppIcon name="grid-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : !hideOrganize && onOrganize ? (
          <TouchableOpacity style={{ padding: 8 }} onPress={() => { playTapSound(); onOrganize?.(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <AppIcon name="grid-outline" size={24} color={editMode ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
        {!onManageCards && !hideMenu && (
          <TouchableOpacity
            style={{ padding: 8 }}
            onPress={() => { playTapSound(); openMenu?.(); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
  if (extendToTop) {
    return (
      <View style={{ paddingTop: insets.top, backgroundColor: colors.bg }}>
        {Bar}
      </View>
    );
  }
  return Bar;
}
