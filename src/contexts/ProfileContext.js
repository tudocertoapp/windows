import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const PROFILE_KEY = '@tudocerto_profile';

const ProfileContext = createContext(undefined);

export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ nome: '', foto: null });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (user) {
          const { data } = await supabase.from('profiles').select('nome, foto').eq('id', user.id).single();
          if (data) {
            setProfile({ nome: data.nome || '', foto: data.foto || null });
          } else {
            setProfile({ nome: user.email?.split('@')[0] || user.user_metadata?.nome || '', foto: null });
          }
        } else {
          const raw = await AsyncStorage.getItem(PROFILE_KEY);
          if (raw) {
            try {
              const data = JSON.parse(raw);
              setProfile((p) => ({
                ...p,
                nome: data.nome || p.nome,
                foto: data.foto ?? p.foto,
              }));
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
      AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    }
  }, [loaded, profile, user]);

  const updateProfile = async (data) => {
    setProfile((p) => ({ ...p, ...data }));
    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        nome: data.nome ?? profile.nome,
        foto: data.foto !== undefined ? data.foto : profile.foto,
        updated_at: new Date().toISOString(),
      });
    }
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  return ctx || { profile: { nome: '', foto: null }, updateProfile: () => {} };
}
