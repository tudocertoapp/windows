import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFinance } from './FinanceContext';
import { useProfile } from './ProfileContext';
import { headerCue } from '../utils/dockMascot';
import { DOCK_SPECTRUM_DEFAULT, DOCK_SPECTRUM_STORAGE_KEY, resolveDockSpectrum } from '../constants/dockSpectrums';

const KEY = '@tudocerto_dock_tone';
const DockMascotContext = createContext({
  tone: 'neutra',
  setTone: () => {},
  cue: { text: '', expression: 'feliz', cta: null },
  firstName: '',
  voiceStatus: { mode: 'wake', listening: false, lastHeard: '', busy: false },
  setVoiceStatus: () => {},
  spectrumId: DOCK_SPECTRUM_DEFAULT,
  setSpectrumId: () => {},
});

export function DockMascotProvider({ children }) {
  const { transactions } = useFinance();
  const { profile } = useProfile();
  const [tone, setToneState] = useState('neutra');
  const [spectrumId, setSpectrumIdState] = useState(DOCK_SPECTRUM_DEFAULT);
  const [voiceStatus, setVoiceStatusState] = useState({
    mode: 'wake',
    listening: false,
    lastHeard: '',
    busy: false,
    stage: false,
    speaking: false,
    caption: '',
    interim: '',
    confirmPrompt: '',
    armed: false,
    error: '',
  });
  const setVoiceStatus = useCallback((patch) => {
    setVoiceStatusState((prev) => ({ ...prev, ...(patch && typeof patch === 'object' ? patch : {}) }));
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === 'formal' || v === 'giria' || v === 'palavrao' || v === 'neutra') setToneState(v);
    }).catch(() => {});
    AsyncStorage.getItem(DOCK_SPECTRUM_STORAGE_KEY).then((v) => {
      if (v) setSpectrumIdState(resolveDockSpectrum(v).id);
    }).catch(() => {});
  }, []);

  const setTone = useCallback((next) => {
    const id = String(next || 'neutra');
    const safe = id === 'formal' || id === 'giria' || id === 'palavrao' ? id : 'neutra';
    setToneState(safe);
    AsyncStorage.setItem(KEY, safe).catch(() => {});
  }, []);

  const setSpectrumId = useCallback((next) => {
    const id = resolveDockSpectrum(next).id;
    setSpectrumIdState(id);
    AsyncStorage.setItem(DOCK_SPECTRUM_STORAGE_KEY, id).catch(() => {});
  }, []);

  const firstName = String(profile?.nome || '').trim().split(/\s+/)[0] || '';
  const cue = useMemo(
    () => headerCue({ transactions, tone, name: firstName }),
    [transactions, tone, firstName]
  );

  const value = useMemo(
    () => ({ tone, setTone, cue, firstName, voiceStatus, setVoiceStatus, spectrumId, setSpectrumId }),
    [tone, setTone, cue, firstName, voiceStatus, spectrumId, setSpectrumId]
  );
  return <DockMascotContext.Provider value={value}>{children}</DockMascotContext.Provider>;
}

export function useDockMascot() {
  return useContext(DockMascotContext);
}
