import React, { useEffect, useState } from 'react';
import { Alert, PermissionsAndroid, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

let Voice: any = null;
try {
  const mod = require('@react-native-voice/voice');
  Voice = mod?.default || mod;
} catch (_) {}

export default function VoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    if (!Voice) return undefined;
    Voice.onSpeechStart = () => {
      setIsListening(true);
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
    };

    Voice.onSpeechResults = (result: any) => {
      setTranscript(result?.value?.[0] || '');
    };

    Voice.onSpeechError = () => {
      setIsListening(false);
      Alert.alert('Voz', 'Não foi possível reconhecer sua fala agora.');
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
    };
  }, []);

  const startListening = async () => {
    if (!Voice) {
      Alert.alert('Voz', 'Reconhecimento nativo indisponível neste build.');
      return;
    }
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Permissão do microfone',
            message: 'Precisamos do microfone para transcrição em tempo real.',
            buttonPositive: 'Permitir',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permissão', 'Permita o uso do microfone para continuar.');
          return;
        }
      }
      await Voice.start('pt-BR');
      setIsListening(true);
    } catch (_) {
      setIsListening(false);
      Alert.alert('Voz', 'Não consegui iniciar o reconhecimento agora.');
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } finally {
      setIsListening(false);
    }
  };

  const clearTranscript = () => {
    setTranscript('');
  };

  return (
    <View style={s.container}>
      <TouchableOpacity
        style={[s.micBtn, { backgroundColor: isListening ? '#ef4444' : '#16a34a' }]}
        onPress={isListening ? stopListening : startListening}
        activeOpacity={0.85}
      >
        <Ionicons name={isListening ? 'stop' : 'mic'} size={28} color="#fff" />
      </TouchableOpacity>

      <Text style={s.status}>{isListening ? 'Ouvindo...' : 'Toque para falar'}</Text>

      <View style={s.transcriptCard}>
        <Text style={s.transcriptText}>{transcript || 'Sua transcrição aparecerá aqui em tempo real.'}</Text>
      </View>

      <TouchableOpacity style={s.clearBtn} onPress={clearTranscript}>
        <Text style={s.clearText}>Limpar texto</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f7fb',
  },
  micBtn: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  status: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  transcriptCard: {
    marginTop: 18,
    width: '100%',
    minHeight: 140,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    justifyContent: 'center',
  },
  transcriptText: {
    fontSize: 22,
    lineHeight: 30,
    color: '#111827',
    fontWeight: '600',
  },
  clearBtn: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
  },
  clearText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 13,
  },
});
