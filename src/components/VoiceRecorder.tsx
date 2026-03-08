import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, PermissionsAndroid, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

let NativeVoice: any = null;
try {
  const mod = require('@react-native-voice/voice');
  NativeVoice = mod?.default || mod;
} catch (_) {}

type VoiceRecorderRenderProps = {
  isListening: boolean;
  transcript: string;
  error: string | null;
  engine: 'native' | 'expo' | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  toggleListening: () => Promise<void>;
  clearTranscript: () => void;
};

type VoiceRecorderProps = {
  locale?: string;
  onTranscriptChange?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  onEngineChange?: (engine: 'native' | 'expo' | null) => void;
  onError?: (message: string) => void;
  children?: (props: VoiceRecorderRenderProps) => React.ReactNode;
};

let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = () => {};
try {
  const sr = require('expo-speech-recognition');
  const mod = sr?.ExpoSpeechRecognitionModule;
  if (mod && typeof mod.isRecognitionAvailable === 'function' && mod.isRecognitionAvailable()) {
    ExpoSpeechRecognitionModule = mod;
    useSpeechRecognitionEvent = sr.useSpeechRecognitionEvent;
  }
} catch (_) {}

export default function VoiceRecorder({
  locale = 'pt-BR',
  onTranscriptChange,
  onFinalTranscript,
  onListeningChange,
  onEngineChange,
  onError,
  children,
}: VoiceRecorderProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<'native' | 'expo' | null>(null);
  const lastTranscriptRef = useRef('');
  const engineRef = useRef<'native' | 'expo' | null>(null);

  const clearTranscript = () => {
    setTranscript('');
    lastTranscriptRef.current = '';
  };

  const emitError = (message: string) => {
    setError(message);
    onError?.(message);
  };

  const startExpoRecognition = async () => {
    if (!ExpoSpeechRecognitionModule) return false;
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync?.();
      if (!permission?.granted) {
        emitError('Permissão de microfone negada.');
        return false;
      }
      engineRef.current = 'expo';
      setEngine('expo');
      setError(null);
      clearTranscript();
      ExpoSpeechRecognitionModule.start?.({ lang: locale, interimResults: true, continuous: false });
      setIsListening(true);
      onListeningChange?.(true);
      return true;
    } catch (_) {
      return false;
    }
  };

  const startListening = async () => {
    setError(null);
    clearTranscript();
    if (NativeVoice) {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Permissão do microfone',
              message: 'Precisamos do microfone para transcrever sua voz.',
              buttonPositive: 'Permitir',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            emitError('Permissão de microfone negada.');
            return;
          }
        }
        const isNativeAvailable = typeof NativeVoice.isAvailable === 'function'
          ? await NativeVoice.isAvailable()
          : true;
        if (isNativeAvailable) {
          engineRef.current = 'native';
          setEngine('native');
          await NativeVoice.start(locale);
          setIsListening(true);
          onListeningChange?.(true);
          return;
        }
      } catch (_) {}
    }

    const expoStarted = await startExpoRecognition();
    if (expoStarted) return;

    engineRef.current = null;
    setEngine(null);
    setIsListening(false);
    onListeningChange?.(false);
    emitError('Não foi possível iniciar o reconhecimento de voz neste aparelho.');
  };

  const stopListening = async () => {
    try {
      if (engineRef.current === 'native' && NativeVoice) {
        await NativeVoice.stop();
      } else if (engineRef.current === 'expo' && ExpoSpeechRecognitionModule) {
        ExpoSpeechRecognitionModule.stop?.();
      }
    } finally {
      setIsListening(false);
      onListeningChange?.(false);
    }
  };

  const toggleListening = async () => {
    if (isListening) await stopListening();
    else await startListening();
  };

  useSpeechRecognitionEvent('start', () => {
    if (engineRef.current !== 'expo') return;
    setIsListening(true);
    onListeningChange?.(true);
    setError(null);
  });

  useSpeechRecognitionEvent('result', (event: any) => {
    if (engineRef.current !== 'expo') return;
    const txt = event?.results?.[0]?.[0]?.transcript ?? '';
    if (!txt) return;
    lastTranscriptRef.current = txt;
    setTranscript(txt);
    onTranscriptChange?.(txt);
  });

  useSpeechRecognitionEvent('end', () => {
    if (engineRef.current !== 'expo') return;
    setIsListening(false);
    onListeningChange?.(false);
    const finalText = (lastTranscriptRef.current || '').trim();
    if (finalText) onFinalTranscript?.(finalText);
  });

  useSpeechRecognitionEvent('error', () => {
    if (engineRef.current !== 'expo') return;
    setIsListening(false);
    onListeningChange?.(false);
    emitError('Erro ao reconhecer sua voz.');
  });

  useEffect(() => {
    onEngineChange?.(engine);
  }, [engine, onEngineChange]);

  useEffect(() => {
    if (!NativeVoice) return;

    NativeVoice.onSpeechStart = () => {
      if (engineRef.current !== 'native') return;
      setIsListening(true);
      onListeningChange?.(true);
      setError(null);
    };

    NativeVoice.onSpeechEnd = () => {
      if (engineRef.current !== 'native') return;
      setIsListening(false);
      onListeningChange?.(false);
      const finalText = (lastTranscriptRef.current || '').trim();
      if (finalText) onFinalTranscript?.(finalText);
    };

    NativeVoice.onSpeechResults = (result: any) => {
      if (engineRef.current !== 'native') return;
      const txt = result?.value?.[0] || '';
      if (!txt) return;
      lastTranscriptRef.current = txt;
      setTranscript(txt);
      onTranscriptChange?.(txt);
    };

    NativeVoice.onSpeechError = () => {
      if (engineRef.current !== 'native') return;
      setIsListening(false);
      onListeningChange?.(false);
      emitError('Erro ao reconhecer sua voz.');
    };

    return () => {
      NativeVoice.destroy?.().then(() => NativeVoice.removeAllListeners?.()).catch(() => {});
    };
  }, [onFinalTranscript, onTranscriptChange, onListeningChange]);

  const api = useMemo(
    () => ({
      isListening,
      transcript,
      error,
      engine,
      startListening,
      stopListening,
      toggleListening,
      clearTranscript,
    }),
    [isListening, transcript, error, engine]
  );

  if (children) {
    return <>{children(api)}</>;
  }

  return (
    <View style={s.container}>
      <TouchableOpacity
        style={[s.micBtn, { backgroundColor: isListening ? '#ef4444' : '#16a34a' }]}
        onPress={toggleListening}
        activeOpacity={0.85}
      >
        <Ionicons name={isListening ? 'stop' : 'mic'} size={28} color="#fff" />
      </TouchableOpacity>
      <Text style={s.status}>{isListening ? 'Ouvindo...' : 'Toque no microfone'}</Text>
      <Text style={s.engineText}>
        {engine === 'native' ? 'Reconhecimento nativo' : engine === 'expo' ? 'Reconhecimento alternativo' : 'Sem reconhecimento ativo'}
      </Text>
      <Text style={s.transcript}>{transcript || 'A transcrição aparece aqui em tempo real.'}</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <TouchableOpacity style={s.clearBtn} onPress={clearTranscript}>
        <Text style={s.clearText}>Limpar texto</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  micBtn: { width: 82, height: 82, borderRadius: 41, justifyContent: 'center', alignItems: 'center' },
  status: { marginTop: 14, fontSize: 15, fontWeight: '700', color: '#111827' },
  engineText: { marginTop: 6, fontSize: 12, color: '#6b7280' },
  transcript: { marginTop: 12, fontSize: 22, lineHeight: 30, color: '#111827', textAlign: 'center' },
  error: { marginTop: 10, fontSize: 13, color: '#dc2626', textAlign: 'center' },
  clearBtn: { marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#e5e7eb' },
  clearText: { color: '#111827', fontWeight: '700', fontSize: 13 },
});
