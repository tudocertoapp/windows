/**
 * Espectros de voz do Dock (esfera azul).
 *
 * DESATIVAR: enabled: false  — some da lista, o app usa o próximo ativo.
 * APAGAR:    delete o objeto deste arquivo.
 * TROCAR:    mude name / paint no DockVoiceSphere (case do id).
 * PADRÃO:    DOCK_SPECTRUM_DEFAULT
 */
export const DOCK_SPECTRUMS = [
  { id: 'malha', name: 'Malha', enabled: true },
  { id: 'nuvem', name: 'Nuvem', enabled: true },
  { id: 'aneis', name: 'Anéis', enabled: true },
  { id: 'orbita', name: 'Órbita', enabled: true },
  { id: 'pulso', name: 'Pulso', enabled: true },
  { id: 'grade', name: 'Grade', enabled: true },
  { id: 'holograma', name: 'Holograma', enabled: true },
  { id: 'radar', name: 'Radar', enabled: true },
  { id: 'nucleo', name: 'Núcleo', enabled: true },
  { id: 'voxel', name: 'Voxel', enabled: true },
  { id: 'circuito', name: 'Circuito', enabled: true },
  { id: 'hex', name: 'Hex', enabled: true },
  { id: 'neural', name: 'Neural', enabled: true },
  { id: 'cristal', name: 'Cristal', enabled: true },
  { id: 'portal', name: 'Portal', enabled: true },
  { id: 'sonar', name: 'Sonar', enabled: true },
  { id: 'fumaca', name: 'Fumaça', enabled: true },
];

export const DOCK_SPECTRUM_DEFAULT = 'malha';
export const DOCK_SPECTRUM_STORAGE_KEY = '@tudocerto_dock_spectrum';

export function listDockSpectrums() {
  return DOCK_SPECTRUMS.filter((item) => item && item.enabled !== false && item.id);
}

export function resolveDockSpectrum(id) {
  const list = listDockSpectrums();
  const hit = list.find((item) => item.id === id);
  return hit || list[0] || { id: DOCK_SPECTRUM_DEFAULT, name: 'Malha', enabled: true };
}
