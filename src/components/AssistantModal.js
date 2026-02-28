import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

let ExpoSpeechRecognitionModule;
let useSpeechRecognitionEvent = () => {}; // no-op quando módulo não disponível
try {
  const sr = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = sr.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = sr.useSpeechRecognitionEvent;
} catch (_) {}

const QUICK_ACTIONS = [
  { id: 'receita', label: 'Receita', icon: 'trending-up' },
  { id: 'despesa', label: 'Despesa', icon: 'trending-down' },
  { id: 'cliente', label: 'Cliente', icon: 'person-add' },
  { id: 'agenda', label: 'Evento', icon: 'calendar' },
  { id: 'produto', label: 'Produto', icon: 'cube' },
  { id: 'servico', label: 'Serviço', icon: 'construct' },
  { id: 'tarefa', label: 'Tarefa', icon: 'checkbox' },
];

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  box: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 16 },
  hint: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  quickBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  closeBtn: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
});

function parseCommand(text) {
  const t = (text || '').toLowerCase().trim();
  if (/receita|entrada|entrou|ganhei|recebi/i.test(t)) return 'receita';
  if (/despesa|saida|gastei|paguei|gasto/i.test(t)) return 'despesa';
  if (/cliente|cliente novo/i.test(t)) return 'cliente';
  if (/evento|agenda|compromisso|reunião/i.test(t)) return 'agenda';
  if (/produto|produto novo/i.test(t)) return 'produto';
  if (/serviço|servico/i.test(t)) return 'servico';
  if (/tarefa|tarefa nova|lembrete/i.test(t)) return 'tarefa';
  if (/fornecedor/i.test(t)) return 'fornecedor';
  const num = t.match(/[\d,\.]+/);
  return { parsed: t, amount: num ? parseFloat(num[0].replace(',', '.')) : null };
}

export function AssistantModal({ visible, onClose, onOpenAdd }) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [micPulse] = useState(() => new Animated.Value(1));

  let isAvailable = false;
  try {
    isAvailable = ExpoSpeechRecognitionModule?.isRecognitionAvailable?.() ?? false;
  } catch (_) {}

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event?.results?.[0]?.[0]?.transcript ?? '';
    if (transcript) setText((prev) => (prev ? `${prev} ${transcript}` : transcript).trim());
  });
  useSpeechRecognitionEvent('error', (event) => {
    if (event?.error !== 'no-speech' && event?.error !== 'aborted') {
      Alert.alert('Voz', 'Não foi possível reconhecer. Verifique o microfone.');
    }
    setListening(false);
  });

  useEffect(() => {
    if (listening) {
      Animated.loop(Animated.sequence([
        Animated.timing(micPulse, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(micPulse, { toValue: 0.9, duration: 500, useNativeDriver: true }),
      ])).start();
    } else {
      micPulse.setValue(1);
    }
  }, [listening]);

  const handleMic = async () => {
    if (!isAvailable) {
      Alert.alert('Voz', 'Reconhecimento de voz não disponível neste dispositivo.');
      return;
    }
    try {
      const res = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!res?.granted) {
        Alert.alert('Permissão', 'É necessário permitir o uso do microfone para reconhecimento de voz.');
        return;
      }
      if (listening) {
        ExpoSpeechRecognitionModule.stop();
      } else {
        ExpoSpeechRecognitionModule.start({ lang: 'pt-BR', interimResults: true, continuous: false });
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível iniciar o microfone.');
    }
  };

  const handleQuick = (id) => {
    onOpenAdd?.(id);
    onClose();
  };

  const handleSubmit = () => {
    const cmd = parseCommand(text);
    if (typeof cmd === 'string') {
      onOpenAdd?.(cmd);
      onClose();
      setText('');
    } else if (cmd.amount && cmd.parsed) {
      if (/receita|entrada|ganhei/i.test(text)) onOpenAdd?.('receita', { amount: cmd.amount, description: text });
      else if (/despesa|saida|gastei/i.test(text)) onOpenAdd?.('despesa', { amount: cmd.amount, description: text });
      else onOpenAdd?.('receita');
      onClose();
      setText('');
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="slide">
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[s.box, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.primaryRgba(0.2) }]} onPress={onClose}>
            <Ionicons name="close" size={20} color={colors.primary} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <TouchableOpacity
              onPress={handleMic}
              disabled={!isAvailable}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: listening ? colors.primary : 'transparent', justifyContent: 'center', alignItems: 'center' }}
            >
              <Animated.View style={{ transform: [{ scale: micPulse }] }}>
                <Ionicons name={listening ? 'mic' : 'mic-outline'} size={26} color={listening ? '#fff' : colors.primary} />
              </Animated.View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { color: colors.text, marginBottom: 0 }]}>Assistente Virtual</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>{isAvailable ? (listening ? 'Gravando... fale agora' : 'Toque no microfone para falar') : 'Digite para usar'}</Text>
            </View>
          </View>
          <Text style={[s.hint, { color: colors.textSecondary }]}>Digite ou toque para cadastrar rapidamente:</Text>
          <TextInput
            style={[s.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="Ex: adicionar receita de 150 reais"
            value={text}
            onChangeText={setText}
            onSubmitEditing={handleSubmit}
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 20 }} onPress={handleSubmit}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Processar</Text>
          </TouchableOpacity>
          <Text style={[s.hint, { color: colors.textSecondary }]}>Ações rápidas:</Text>
          <View style={s.quickGrid}>
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity key={a.id} style={[s.quickBtn, { backgroundColor: 'transparent' }]} onPress={() => handleQuick(a.id)}>
                <Ionicons name={a.icon} size={18} color={colors.primary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
