import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Alert } from 'react-native';
import { parseVoiceIntent } from '../utils/voiceExpenseParser';

let ExpoSpeechRecognitionModule = null;
let useSpeechRecognitionEvent = () => {};
try {
  const sr = require('expo-speech-recognition');
  const mod = sr?.ExpoSpeechRecognitionModule;
  if (mod) {
    ExpoSpeechRecognitionModule = mod;
    useSpeechRecognitionEvent = sr.useSpeechRecognitionEvent || (() => {});
  }
} catch (_) {}

/**
 * Componente invisível que escuta voz e ao terminar chama onResult(type, params).
 * Expõe startListening() via ref — ao clicar no microfone chama ref.current.startListening().
 */
export const VoiceListener = forwardRef(function VoiceListener({ onResult }, ref) {
  const lastTranscriptRef = useRef('');

  useSpeechRecognitionEvent('start', () => {
    lastTranscriptRef.current = '';
  });
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event?.results?.[0]?.[0]?.transcript ?? '';
    if (transcript) {
      lastTranscriptRef.current = (lastTranscriptRef.current ? `${lastTranscriptRef.current} ` : '') + transcript;
    }
  });
  useSpeechRecognitionEvent('end', () => {
    const toParse = lastTranscriptRef.current.trim();
    if (!toParse) return;
    const parsed = parseVoiceIntent(toParse);
    lastTranscriptRef.current = '';
    if (parsed?.type) {
      onResult?.(parsed.type, parsed.params);
    }
  });
  useSpeechRecognitionEvent('error', (event) => {
    if (event?.error !== 'no-speech' && event?.error !== 'aborted') {
      Alert.alert('Voz', 'Não foi possível reconhecer. Verifique o microfone.');
    }
  });

  useImperativeHandle(ref, () => ({
    async startListening() {
      if (!ExpoSpeechRecognitionModule) {
        Alert.alert('Voz', 'Reconhecimento de voz não disponível neste dispositivo ou build.');
        return;
      }
      try {
        const res = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!res?.granted) {
          Alert.alert('Permissão', 'Permita o uso do microfone para cadastrar por voz.');
          return;
        }
        ExpoSpeechRecognitionModule.start({ lang: 'pt-BR', interimResults: true, continuous: false });
      } catch (e) {
        Alert.alert('Erro', 'Não foi possível iniciar o microfone.');
      }
    },
  }), []);

  return null;
});
