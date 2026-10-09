export const DOCK_VOICES = [
  {
    id: 'grave',
    name: 'Grave',
    hint: 'Masculina, mais baixa',
    prefer: [/microsoft antonio/, /antonio/, /microsoft daniel/, /daniel/, /ricardo/, /felipe/],
    gender: 'male',
    pitch: 0.82,
    rate: 1.08,
  },
  {
    id: 'clara',
    name: 'Clara',
    hint: 'Feminina, mais clara',
    prefer: [/microsoft francisca/, /francisca/, /maria/, /luciana/, /thalita/, /heloisa/],
    gender: 'female',
    pitch: 1.06,
    rate: 1.05,
  },
  {
    id: 'agil',
    name: 'Ágil',
    hint: 'Ritmo mais rápido',
    prefer: [/google português do brasil/, /microsoft antonio/, /antonio/, /google português/],
    gender: 'male',
    pitch: 1.0,
    rate: 1.28,
  },
  {
    id: 'calma',
    name: 'Calma',
    hint: 'Mais lenta e pausada',
    prefer: [/microsoft daniel/, /daniel/, /microsoft antonio/, /antonio/],
    gender: 'male',
    pitch: 0.88,
    rate: 0.9,
  },
  {
    id: 'natural',
    name: 'Natural',
    hint: 'Padrão do sistema',
    prefer: [/google português do brasil/, /microsoft antonio/, /google português/, /pt-br/],
    gender: 'any',
    pitch: 1.0,
    rate: 1.12,
  },
];

export const DOCK_VOICE_DEFAULT = 'grave';
export const DOCK_VOICE_STORAGE_KEY = '@tudocerto_dock_tts_voice';

export function listDockVoices() {
  return DOCK_VOICES.filter((item) => item && item.id);
}

export function resolveDockVoice(id) {
  const list = listDockVoices();
  return list.find((item) => item.id === id) || list[0] || DOCK_VOICES[0];
}
