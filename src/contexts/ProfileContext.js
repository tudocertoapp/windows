import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ThemeSync } from '../components/ThemeSync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const PROFILE_BASE = '@tudocerto_profile';
const LAST_FOTO_KEY = '@tudocerto_last_foto';

const ProfileContext = createContext(undefined);

function getLastFotoKey(userId) {
  return `${LAST_FOTO_KEY}_${userId || 'guest'}`;
}

export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ nome: '', foto: null, profissao: '', empresa: '', primary_color: null, theme_mode: null, custom_bg: null });
  const [loaded, setLoaded] = useState(false);

  const profileStorageKey = `${PROFILE_BASE}_${user?.id || 'guest'}`;

  useEffect(() => {
    setProfile({ nome: '', foto: null, profissao: '', empresa: '', primary_color: null, theme_mode: null, custom_bg: null });
    setLoaded(false);
    (async () => {
      try {
        if (user) {
          let data = null;
          const { data: fullData, error } = await supabase.from('profiles').select('nome, foto, profissao, empresa, primary_color, theme_mode, custom_bg').eq('id', user.id).single();
          if (!error && fullData) {
            data = fullData;
          } else {
            const { data: basicData } = await supabase.from('profiles').select('nome, foto, primary_color, theme_mode, custom_bg').eq('id', user.id).single();
            data = basicData ? { ...basicData, profissao: basicData.profissao || '', empresa: basicData.empresa || '', primary_color: basicData.primary_color, theme_mode: basicData.theme_mode, custom_bg: basicData.custom_bg } : null;
          }
          if (data) {
            setProfile({
              nome: data.nome || '',
              foto: data.foto || null,
              profissao: data.profissao || '',
              empresa: data.empresa || '',
              primary_color: data.primary_color || null,
              theme_mode: data.theme_mode || null,
              custom_bg: data.custom_bg || null,
            });
          } else {
            const fallback = {
              nome: user.email?.split('@')[0] || user.user_metadata?.nome || '',
              foto: null,
              profissao: '',
              empresa: '',
              primary_color: '#10b981',
              theme_mode: 'light',
              custom_bg: '#f9fafb',
            };
            setProfile(fallback);
            supabase.from('profiles').upsert({
              id: user.id,
              nome: fallback.nome,
              primary_color: fallback.primary_color,
              theme_mode: fallback.theme_mode,
              custom_bg: fallback.custom_bg,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' }).then(() => {}).catch(() => {});
          }
        } else {
          const raw = await AsyncStorage.getItem(profileStorageKey);
          if (raw) {
            try {
              const data = JSON.parse(raw);
              setProfile({
                nome: data.nome || '',
                foto: data.foto ?? null,
                profissao: data.profissao || '',
                empresa: data.empresa || '',
              });
            } catch (_) {}
          }
        }
      } catch (_) {}
      setLoaded(true);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!loaded) return;
    if (!user) {
      AsyncStorage.setItem(profileStorageKey, JSON.stringify(profile));
    }
  }, [loaded, profile, user, profileStorageKey]);

  const getLastFoto = useCallback(async () => {
    try {
      return await AsyncStorage.getItem(getLastFotoKey(user?.id));
    } catch (_) {
      return null;
    }
  }, [user?.id]);

  const updateProfile = async (data) => {
    if (data.foto !== undefined && data.foto !== profile.foto && profile.foto) {
      await AsyncStorage.setItem(getLastFotoKey(user?.id), profile.foto);
    }
    setProfile((p) => ({ ...p, ...data }));
    if (user) {
      const payload = {
        id: user.id,
        nome: data.nome ?? profile.nome,
        foto: data.foto !== undefined ? data.foto : profile.foto,
        profissao: data.profissao !== undefined ? data.profissao : profile.profissao,
        empresa: data.empresa !== undefined ? data.empresa : profile.empresa,
        updated_at: new Date().toISOString(),
      };
      if (data.primary_color !== undefined) payload.primary_color = data.primary_color;
      if (data.theme_mode !== undefined) payload.theme_mode = data.theme_mode;
      if (data.custom_bg !== undefined) payload.custom_bg = data.custom_bg;
      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (error) {
        setProfile((p) => ({ ...p, nome: profile.nome, foto: profile.foto, profissao: profile.profissao ?? '', empresa: profile.empresa ?? '' })); // reverte
        throw new Error(error.message);
      }
    }
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, getLastFoto }}>
      <ThemeSync>{children}</ThemeSync>
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  return ctx || { profile: { nome: '', foto: null, profissao: '', empresa: '' }, updateProfile: () => {}, getLastFoto: async () => null };
}
