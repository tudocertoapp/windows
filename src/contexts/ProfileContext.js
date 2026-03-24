import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ThemeSync } from '../components/ThemeSync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getCachedPhotoUri, cacheProfilePhoto } from '../utils/profilePhotoCache';

const PROFILE_BASE = '@tudocerto_profile';
const LAST_FOTO_KEY = '@tudocerto_last_foto';

const ProfileContext = createContext(undefined);

function getLastFotoKey(userId) {
  return `${LAST_FOTO_KEY}_${userId || 'guest'}`;
}

export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ nome: '', foto: null, fotoLocal: null, profissao: '', empresa: '', cnpj: '', endereco: '', telefone: '', email: '', primary_color: null, theme_mode: null, custom_bg: null });
  const [loaded, setLoaded] = useState(false);

  const profileStorageKey = `${PROFILE_BASE}_${user?.id || 'guest'}`;

  useEffect(() => {
    setProfile({ nome: '', foto: null, fotoLocal: null, profissao: '', empresa: '', cnpj: '', endereco: '', telefone: '', email: '', primary_color: null, theme_mode: null, custom_bg: null });
    setLoaded(false);
    (async () => {
      try {
        if (user) {
          const cachedUri = await getCachedPhotoUri(user.id);
          let data = null;
          const { data: fullData, error: fullError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (!fullError && fullData) {
            data = {
              ...fullData,
              cnpj: fullData.cnpj || '',
              endereco: fullData.endereco || '',
              telefone: fullData.telefone || '',
              email: fullData.email || user?.email || '',
            };
          } else {
            data = null;
          }
          if (data) {
            let fotoLocal = cachedUri;
            if (data.foto) {
              const localUri = await cacheProfilePhoto(data.foto, user.id);
              if (localUri) fotoLocal = localUri;
            }
            setProfile({
              nome: data.nome || '',
              foto: data.foto || null,
              fotoLocal: fotoLocal || null,
              profissao: data.profissao || '',
              empresa: data.empresa || '',
              cnpj: data.cnpj || '',
              endereco: data.endereco || '',
              telefone: data.telefone || '',
              email: data.email || '',
              primary_color: data.primary_color || null,
              theme_mode: data.theme_mode || null,
              custom_bg: data.custom_bg || null,
            });
          } else {
            const fallback = {
              nome: user.email?.split('@')[0] || user.user_metadata?.nome || '',
              foto: null,
              fotoLocal: cachedUri,
              profissao: '',
              empresa: '',
              cnpj: '',
              endereco: '',
              telefone: '',
              email: user?.email || '',
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
              const cachedUri = await getCachedPhotoUri(user?.id);
              setProfile({
                nome: data.nome || '',
                foto: data.foto ?? null,
                fotoLocal: cachedUri,
                profissao: data.profissao || '',
                empresa: data.empresa || '',
                cnpj: data.cnpj || '',
                endereco: data.endereco || '',
                telefone: data.telefone || '',
                email: data.email || '',
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
    let fotoLocal = profile.fotoLocal;
    if (data.foto !== undefined && data.foto) {
      const localUri = await cacheProfilePhoto(data.foto, user?.id);
      if (localUri) fotoLocal = localUri;
    }
    if (data.foto === null || data.foto === '') fotoLocal = null;
    setProfile((p) => ({ ...p, ...data, fotoLocal: data.foto !== undefined ? fotoLocal : p.fotoLocal }));
    if (user) {
      const payload = {
        id: user.id,
        nome: data.nome ?? profile.nome,
        foto: data.foto !== undefined ? data.foto : profile.foto,
        profissao: data.profissao !== undefined ? data.profissao : profile.profissao,
        empresa: data.empresa !== undefined ? data.empresa : profile.empresa,
        updated_at: new Date().toISOString(),
      };
      if (data.cnpj !== undefined) payload.cnpj = data.cnpj;
      if (data.endereco !== undefined) payload.endereco = data.endereco;
      if (data.telefone !== undefined) payload.telefone = data.telefone;
      if (data.email !== undefined) payload.email = data.email;
      if (data.primary_color !== undefined) payload.primary_color = data.primary_color;
      if (data.theme_mode !== undefined) payload.theme_mode = data.theme_mode;
      if (data.custom_bg !== undefined) payload.custom_bg = data.custom_bg;
      let { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (error && (error.message?.includes('cnpj') || error.message?.includes('endereco') || error.message?.includes('telefone') || error.message?.includes('column'))) {
        const payloadBase = { id: user.id, nome: payload.nome, foto: payload.foto, profissao: payload.profissao, empresa: payload.empresa, updated_at: payload.updated_at };
        if (payload.primary_color !== undefined) payloadBase.primary_color = payload.primary_color;
        if (payload.theme_mode !== undefined) payloadBase.theme_mode = payload.theme_mode;
        if (payload.custom_bg !== undefined) payloadBase.custom_bg = payload.custom_bg;
        const res = await supabase.from('profiles').upsert(payloadBase, { onConflict: 'id' });
        error = res.error;
      }
      if (error) {
        setProfile((p) => ({ ...p, nome: profile.nome, foto: profile.foto, fotoLocal: profile.fotoLocal, profissao: profile.profissao ?? '', empresa: profile.empresa ?? '' }));
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
  return ctx || { profile: { nome: '', foto: null, profissao: '', empresa: '', cnpj: '', endereco: '', telefone: '', email: '' }, updateProfile: () => {}, getLastFoto: async () => null };
}
