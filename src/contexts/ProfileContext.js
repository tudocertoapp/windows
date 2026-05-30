import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getCachedPhotoUri, cacheProfilePhoto } from '../utils/profilePhotoCache';
import { BRAND_GREEN } from '../constants/brandColors';
import { EMPRESA_ENDERECO_FIELDS, EMPTY_EMPRESA_ENDERECO, buildEnderecoCompleto } from '../utils/empresaProfile';

const PROFILE_BASE = '@tudocerto_profile';
const LAST_FOTO_KEY = '@tudocerto_last_foto';

const EMPTY_PROFILE = {
  nome: '',
  foto: null,
  fotoLocal: null,
  profissao: '',
  empresa: '',
  cnpj: '',
  endereco: '',
  telefone: '',
  email: '',
  primary_color: null,
  theme_mode: null,
  custom_bg: null,
  ...EMPTY_EMPRESA_ENDERECO,
};

function mapProfileFromDb(data, userEmail) {
  return {
    nome: data.nome || '',
    foto: data.foto || null,
    fotoLocal: null,
    profissao: data.profissao || '',
    empresa: data.empresa || '',
    cnpj: data.cnpj || '',
    endereco: data.endereco || '',
    telefone: data.telefone || '',
    email: data.email || userEmail || '',
    primary_color: data.primary_color || null,
    theme_mode: data.theme_mode || null,
    custom_bg: data.custom_bg || null,
    ...pickEmpresaFields(data),
  };
}

function pickEmpresaFields(data) {
  const out = { ...EMPTY_EMPRESA_ENDERECO };
  EMPRESA_ENDERECO_FIELDS.forEach((key) => {
    out[key] = data?.[key] || '';
  });
  return out;
}

const ProfileContext = createContext(undefined);

function getLastFotoKey(userId) {
  return `${LAST_FOTO_KEY}_${userId || 'guest'}`;
}

export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loaded, setLoaded] = useState(false);

  const profileStorageKey = `${PROFILE_BASE}_${user?.id || 'guest'}`;

  useEffect(() => {
    setProfile({ ...EMPTY_PROFILE });
    setLoaded(false);
    (async () => {
      try {
        if (user) {
          const cachedUri = await getCachedPhotoUri(user.id);
          let data = null;
          const { data: fullData, error: fullError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (!fullError && fullData) {
            data = mapProfileFromDb(fullData, user?.email);
          } else {
            data = null;
          }
          if (data) {
            let fotoLocal = cachedUri;
            if (data.foto) {
              const localUri = await cacheProfilePhoto(data.foto, user.id);
              if (localUri) fotoLocal = localUri;
            }
            setProfile({ ...data, fotoLocal: fotoLocal || null });
          } else {
            const fallback = {
              ...EMPTY_PROFILE,
              nome: user.email?.split('@')[0] || user.user_metadata?.nome || '',
              fotoLocal: cachedUri,
              email: user?.email || '',
              primary_color: BRAND_GREEN,
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
                ...mapProfileFromDb(data, user?.email),
                foto: data.foto ?? null,
                fotoLocal: cachedUri,
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
      EMPRESA_ENDERECO_FIELDS.forEach((key) => {
        if (data[key] !== undefined) payload[key] = data[key];
      });
      const mergedForEndereco = { ...profile, ...data };
      if (
        data.endereco === undefined &&
        EMPRESA_ENDERECO_FIELDS.some((key) => data[key] !== undefined)
      ) {
        payload.endereco = buildEnderecoCompleto(mergedForEndereco);
      }
      if (data.primary_color !== undefined) payload.primary_color = data.primary_color;
      if (data.theme_mode !== undefined) payload.theme_mode = data.theme_mode;
      if (data.custom_bg !== undefined) payload.custom_bg = data.custom_bg;
      let { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (error && (error.message?.includes('column') || error.message?.includes('cnpj') || error.message?.includes('endereco') || error.message?.includes('telefone') || error.message?.includes('instagram'))) {
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
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  return ctx || { profile: { ...EMPTY_PROFILE }, updateProfile: () => {}, getLastFoto: async () => null };
}
