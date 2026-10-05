import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import {
  isWebSpeechAvailable,
  registerWebSpeech,
  takeWebSpeech,
  unlockWebMic,
  stopWebSpeech,
} from '../utils/webSpeech';

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
  /** Não exigir isRecognitionAvailable() aqui — no iOS pode ser falso até haver permissões. */
  if (mod) {
    ExpoSpeechRecognitionModule = mod;
    useSpeechRecognitionEvent = sr.useSpeechRecognitionEvent ?? (() => {});
  }
} catch (_) {}

/** iOS: microfone + reconhecimento de fala (SFSpeechRecognizer) antes de @react-native-voice. */
async function requestIosVoicePermissions(): Promise<boolean> {
  try {
    const sr = require('expo-speech-recognition');
    const mod = sr?.ExpoSpeechRecognitionModule;
    if (mod && typeof mod.requestPermissionsAsync === 'function') {
      const res = await mod.requestPermissionsAsync();
      if (res?.granted) return true;
    }
  } catch (_) {}
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (_) {
    return false;
  }
}

function normalizeVoiceErrorCode(evt: any): string {
  const raw = String(
    evt?.error?.code
      || evt?.error?.message
      || evt?.code
      || evt?.message
      || evt?.error
      || ''
  )
    .toLowerCase()
    .trim();
  return raw;
}

function isIgnorableVoiceError(code: string): boolean {
  // Android SpeechRecognizer: "7" costuma mapear para NO_MATCH/no-speech.
  return (
    code.includes('no-speech')
    || code.includes('aborted')
    || code === '7'
    || code.includes('no match')
    || code.includes('speech timeout')
  );
}

function isRetryableVoiceError(code: string): boolean {
  return (
    code.includes('network')
    || code.includes('timeout')
    || code.includes('busy')
    || code === '5'
    || code === '6'
  );
}

/** Junta segmentos sem repetir quando o motor devolve texto cumulativo ou parcial. */
function mergeTranscript(existing: string, incoming: string): string {
  const prev = String(existing || '').trim();
  const next = String(incoming || '').trim();
  if (!next) return prev;
  if (!prev) return next;
  if (next === prev) return prev;
  if (next.startsWith(prev)) return next;
  if (prev.startsWith(next)) return prev;
  if (prev.endsWith(next)) return prev;
  if (prev.includes(next)) return prev;
  return `${prev} ${next}`.trim();
}

function buildDisplayTranscript(committed: string, partial: string): string {
  const c = String(committed || '').trim();
  const p = String(partial || '').trim();
  if (!c) return p;
  if (!p) return c;
  if (p.startsWith(c)) return p;
  if (c.endsWith(p)) return c;
  return `${c} ${p}`.trim();
}

/** Aguarda o motor nativo/expo emitir o último trecho após Voice.stop(). */
function waitForFinalSpeechResult(ms = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const committedTranscriptRef = useRef('');
  const partialTranscriptRef = useRef('');
  const engineRef = useRef<'native' | 'expo' | null>(null);
  const webRecognitionRef = useRef<{ stop: () => void; abort?: () => void } | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const manualStopRef = useRef(false);
  const finalEmittedRef = useRef(false);

  const syncTranscriptUi = (display: string) => {
    const text = String(display || '').trim();
    lastTranscriptRef.current = text;
    setTranscript(text);
    onTranscriptChange?.(text);
  };

  const commitSegment = (segment: string) => {
    const merged = mergeTranscript(committedTranscriptRef.current, segment);
    if (!merged) return;
    committedTranscriptRef.current = merged;
    partialTranscriptRef.current = '';
    syncTranscriptUi(merged);
  };

  const updatePartial = (partial: string) => {
    partialTranscriptRef.current = String(partial || '').trim();
    syncTranscriptUi(buildDisplayTranscript(committedTranscriptRef.current, partialTranscriptRef.current));
  };

  const flushPartialToCommitted = () => {
    if (partialTranscriptRef.current.trim()) {
      commitSegment(partialTranscriptRef.current);
    }
  };

  const emitFinalTranscriptOnce = () => {
    if (finalEmittedRef.current) return;
    flushPartialToCommitted();
    const finalText = (lastTranscriptRef.current || committedTranscriptRef.current || '').trim();
    if (!finalText) return;
    finalEmittedRef.current = true;
    lastTranscriptRef.current = finalText;
    onFinalTranscript?.(finalText);
  };

  const clearTranscript = () => {
    committedTranscriptRef.current = '';
    partialTranscriptRef.current = '';
    lastTranscriptRef.current = '';
    setTranscript('');
  };

  const emitError = (message: string) => {
    setError(message);
    onError?.(message);
  };

  const startExpoRecognition = async () => {
    let mod = ExpoSpeechRecognitionModule;
    if (!mod) {
      try {
        const sr = require('expo-speech-recognition');
        mod = sr?.ExpoSpeechRecognitionModule;
        if (mod) ExpoSpeechRecognitionModule = mod;
      } catch (_) {}
    }
    if (!mod) return false;
    try {
      const permission = await mod.requestPermissionsAsync?.();
      if (!permission?.granted) {
        emitError('Permissão de microfone negada.');
        return false;
      }
      if (typeof mod.isRecognitionAvailable === 'function' && !mod.isRecognitionAvailable()) {
        return false;
      }
      engineRef.current = 'expo';
      setEngine('expo');
      setError(null);
      clearTranscript();
      mod.start?.({ lang: locale, interimResults: true, continuous: true });
      setIsListening(true);
      onListeningChange?.(true);
      return true;
    } catch (_) {
      return false;
    }
  };

  const startWebRecognition = async (): Promise<boolean> => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    if (!isWebSpeechAvailable()) return false;
    try {
      await unlockWebMic();
    } catch (_) {
      emitError('Permissão de microfone negada. Permita o microfone no ícone da barra de endereço.');
      return false;
    }
    try {
      registerWebSpeech('dictation', {
        onResult: (ev: any) => {
          let text = '';
          for (let i = 0; i < ev.results.length; i += 1) {
            text += ev.results[i][0]?.transcript || '';
          }
          const t = String(text || '').trim();
          if (t) syncTranscriptUi(t);
        },
        onError: (ev: any) => {
          const code = ev?.error || '';
          if (code === 'aborted' || code === 'no-speech') return;
          if (code === 'not-allowed') {
            emitError('Permissão de microfone negada. Permita o microfone no ícone da barra de endereço.');
            setIsListening(false);
            onListeningChange?.(false);
            return;
          }
          emitError('Erro ao reconhecer sua voz.');
        },
        onEnd: () => {
          if (!manualStopRef.current && shouldKeepListeningRef.current) return;
          setIsListening(false);
          onListeningChange?.(false);
          emitFinalTranscriptOnce();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tc:dock-wake-resume'));
          }
        },
      });
      takeWebSpeech('dictation');
      engineRef.current = 'expo';
      setEngine('expo');
      setError(null);
      setIsListening(true);
      onListeningChange?.(true);
      return true;
    } catch (_) {
      return false;
    }
  };

  const startListening = async () => {
    manualStopRef.current = false;
    shouldKeepListeningRef.current = true;
    finalEmittedRef.current = false;
    setError(null);
    clearTranscript();

    if (Platform.OS === 'web') {
      const ok = await startWebRecognition();
      if (!ok) {
        engineRef.current = null;
        setEngine(null);
        setIsListening(false);
        onListeningChange?.(false);
        if (!isWebSpeechAvailable()) {
          emitError('Reconhecimento de voz não disponível neste navegador (experimente Chrome ou Edge).');
        }
      }
      return;
    }

    const isNativeMobile = Platform.OS === 'ios' || Platform.OS === 'android';

    // Ajuste de modo de áudio ajuda em aparelhos onde o microfone não inicia na 1a tentativa.
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    } catch (_) {}

    // Android: SpeechRecognizer | iOS: SFSpeechRecognizer (via @react-native-voice/voice)
    if (NativeVoice && isNativeMobile) {
      let startedNative = false;
      try {
        if (Platform.OS === 'android') {
          try {
            const audioPerm = await Audio.requestPermissionsAsync();
            if (audioPerm?.status !== 'granted') {
              emitError('Permissão de microfone negada.');
              return;
            }
          } catch (_) {}
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
          } else {
            const isNativeAvailable =
              typeof NativeVoice.isAvailable === 'function'
                ? await NativeVoice.isAvailable()
                : true;
            if (isNativeAvailable) {
              engineRef.current = 'native';
              setEngine('native');
              await NativeVoice.start(locale);
              setIsListening(true);
              onListeningChange?.(true);
              startedNative = true;
            }
          }
        } else if (Platform.OS === 'ios') {
          const permOk = await requestIosVoicePermissions();
          if (!permOk) {
            emitError('Permissão de microfone ou reconhecimento de voz negada.');
          } else {
            const isNativeAvailable =
              typeof NativeVoice.isAvailable === 'function'
                ? await NativeVoice.isAvailable()
                : true;
            if (isNativeAvailable) {
              engineRef.current = 'native';
              setEngine('native');
              await NativeVoice.start(locale);
              setIsListening(true);
              onListeningChange?.(true);
              startedNative = true;
            }
          }
        }
      } catch (_) {
        // Não emitir erro aqui: o reconhecimento nativo pode falhar e o fallback (expo) ainda assim
        // inicia com sucesso — mostrar mensagem nesse caso confunde o utilizador.
      }
      if (startedNative) return;
    }

    const expoStarted = await startExpoRecognition();
    if (expoStarted) return;

    engineRef.current = null;
    shouldKeepListeningRef.current = false;
    setEngine(null);
    setIsListening(false);
    onListeningChange?.(false);
    emitError('Não foi possível iniciar o reconhecimento de voz neste aparelho.');
  };

  const stopListening = async () => {
    manualStopRef.current = true;
    shouldKeepListeningRef.current = false;
    const currentEngine = engineRef.current;
    try {
      if (Platform.OS === 'web') {
        stopWebSpeech('dictation');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tc:dock-wake-resume'));
        }
      } else if (currentEngine === 'native' && NativeVoice) {
        await NativeVoice.stop();
        await waitForFinalSpeechResult(500);
      } else if (currentEngine === 'expo' && ExpoSpeechRecognitionModule) {
        ExpoSpeechRecognitionModule.stop?.();
        await waitForFinalSpeechResult(500);
      }
    } finally {
      setIsListening(false);
      onListeningChange?.(false);
      emitFinalTranscriptOnce();
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
    const txt =
      event?.results?.[0]?.[0]?.transcript
      || event?.results?.[0]?.transcript
      || event?.result
      || '';
    if (!txt) return;
    const isFinal =
      event?.isFinal
      ?? event?.results?.[0]?.[0]?.isFinal
      ?? event?.results?.[0]?.isFinal
      ?? false;
    if (isFinal) commitSegment(txt);
    else updatePartial(txt);
  });

  useSpeechRecognitionEvent('end', () => {
    if (engineRef.current !== 'expo') return;
    if (!manualStopRef.current && shouldKeepListeningRef.current && ExpoSpeechRecognitionModule) {
      try {
        ExpoSpeechRecognitionModule.start?.({ lang: locale, interimResults: true, continuous: true });
        setIsListening(true);
        onListeningChange?.(true);
        return;
      } catch (_) {}
    }
    setIsListening(false);
    onListeningChange?.(false);
    if (manualStopRef.current) return;
  });

  useSpeechRecognitionEvent('error', (evt: any) => {
    if (engineRef.current !== 'expo') return;
    const code = normalizeVoiceErrorCode(evt);
    if (isIgnorableVoiceError(code)) return;
    if (!manualStopRef.current && shouldKeepListeningRef.current && isRetryableVoiceError(code) && ExpoSpeechRecognitionModule) {
      try {
        ExpoSpeechRecognitionModule.start?.({ lang: locale, interimResults: true, continuous: true });
        setIsListening(true);
        onListeningChange?.(true);
        return;
      } catch (_) {}
    }
    setIsListening(false);
    onListeningChange?.(false);
    if (!manualStopRef.current && shouldKeepListeningRef.current) return;
    emitError('Erro ao reconhecer sua voz.');
  });

  useEffect(() => {
    onEngineChange?.(engine);
  }, [engine, onEngineChange]);

  useEffect(() => {
    if (Platform.OS === 'web' || !NativeVoice) return;

    NativeVoice.onSpeechStart = () => {
      if (engineRef.current !== 'native') return;
      setIsListening(true);
      onListeningChange?.(true);
      setError(null);
    };

    NativeVoice.onSpeechEnd = () => {
      if (engineRef.current !== 'native') return;
      flushPartialToCommitted();
      if (!manualStopRef.current && shouldKeepListeningRef.current && NativeVoice) {
        NativeVoice.start(locale).catch(() => {});
        setIsListening(true);
        onListeningChange?.(true);
        return;
      }
      setIsListening(false);
      onListeningChange?.(false);
      if (manualStopRef.current) return;
    };

    NativeVoice.onSpeechPartialResults = (result: any) => {
      if (engineRef.current !== 'native') return;
      const txt = result?.value?.[0] || '';
      if (!txt) return;
      updatePartial(txt);
    };

    NativeVoice.onSpeechResults = (result: any) => {
      if (engineRef.current !== 'native') return;
      const txt = result?.value?.[0] || '';
      if (!txt) return;
      commitSegment(txt);
    };

    NativeVoice.onSpeechError = (evt: any) => {
      if (engineRef.current !== 'native') return;
      const code = normalizeVoiceErrorCode(evt);
      if (isIgnorableVoiceError(code)) return;
      if (!manualStopRef.current && shouldKeepListeningRef.current && isRetryableVoiceError(code) && NativeVoice) {
        NativeVoice.start(locale).catch(() => {});
        setIsListening(true);
        onListeningChange?.(true);
        return;
      }
      setIsListening(false);
      onListeningChange?.(false);
      if (!manualStopRef.current && shouldKeepListeningRef.current) return;
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
