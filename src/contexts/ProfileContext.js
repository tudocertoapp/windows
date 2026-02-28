import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [profile, setProfile] = useState({ nome: '', foto: null, profissao: '', empresa: '' });
  const [loaded, setLoaded] = useState(false);

  const profileStorageKey = `${PROFILE_BASE}_${user?.id || 'guest'}`;

  useEffect(() => {
    setProfile({ nome: '', foto: null, profissao: '', empresa: '' });
    setLoaded(false);
    (async () => {
      try {
        if (user) {
          let data = null;
          const { data: fullData, error } = await supabase.from('profiles').select('nome, foto, profissao, empresa').eq('id', user.id).single();
          if (!error && fullData) {
            data = fullData;
          } else {
            const { data: basicData } = await supabase.from('profiles').select('nome, foto').eq('id', user.id).single();
            data = basicData ? { ...basicData, profissao: '', empresa: '' } : null;
          }
          if (data) {
            setProfile({
              nome: data.nome || '',
              foto: data.foto || null,
              profissao: data.profissao || '',
              empresa: data.empresa || '',
            });
          } else {
            setProfile({
              nome: user.email?.split('@')[0] || user.user_metadata?.nome || '',
              foto: null,
              profissao: '',
              empresa: '',
            });
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
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        nome: data.nome ?? profile.nome,
        foto: data.foto !== undefined ? data.foto : profile.foto,
        profissao: data.profissao !== undefined ? data.profissao : profile.profissao,
        empresa: data.empresa !== undefined ? data.empresa : profile.empresa,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (error) {
        setProfile((p) => ({ ...p, nome: profile.nome, foto: profile.foto, profissao: profile.profissao ?? '', empresa: profile.empresa ?? '' })); // reverte
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
  return ctx || { profile: { nome: '', foto: null, profissao: '', empresa: '' }, updateProfile: () => {}, getLastFoto: async () => null };
}
