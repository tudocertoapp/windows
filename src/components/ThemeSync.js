import React, { useEffect, useRef } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Sincroniza o tema do app com as preferências salvas no perfil do usuário.
 * Quando o usuário faz login, aplica primary_color, theme_mode e custom_bg do perfil.
 */
export function ThemeSync({ children }) {
  const { profile } = useProfile();
  const { applyFromProfile } = useTheme();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (!profile) return;
    const hasTheme = profile.primary_color != null || profile.theme_mode != null || profile.custom_bg != null;
    if (!hasTheme) return;
    if (appliedRef.current) return;
    appliedRef.current = true;
    applyFromProfile({
      primary_color: profile.primary_color,
      theme_mode: profile.theme_mode,
      custom_bg: profile.custom_bg,
    });
  }, [profile, profile?.primary_color, profile?.theme_mode, profile?.custom_bg, applyFromProfile]);

  return children;
}
