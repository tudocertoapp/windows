import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppIcon } from '../components/AppIcon';
import { useTheme } from '../contexts/ThemeContext';
import { useGoals } from '../contexts/GoalsContext';
import { topBarStyles } from '../components/TopBar';
import { GlassCard } from '../components/GlassCard';
import { playTapSound } from '../utils/sounds';
import { formatCurrency, parseMoney } from '../utils/format';
import { MoneyInput } from '../components/MoneyInput';

const mes = StyleSheet.create({
  container: { flex: 1 },
  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', marginBottom: 20 },
  addBtnText: { fontSize: 15, fontWeight: '700' },
  goalCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  goalPhoto: { width: '100%', height: 140, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  goalPhotoPlaceholder: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  goalBody: { padding: 16 },
  goalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  goalTarget: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  progressWrap: { height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12, backgroundColor: 'rgba(0,0,0,0.1)' },
  progressFill: { height: '100%', borderRadius: 6 },
  cofrinhoRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 },
  cofrinhoInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  cofrinhoBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyTitle: { fontSize: 12, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginBottom: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalScroll: { flexGrow: 1, maxHeight: 280 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  photoRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  photoThumb: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden' },
  photoAdd: { width: 72, height: 72, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 15 },
  chartBar: { height: 24, borderRadius: 8, overflow: 'hidden', marginBottom: 6, minWidth: 40 },
});

const MONTH_NAMES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatMonthKey(k) {
  if (!k) return '';
  const [y, m] = k.split('-');
  return `${MONTH_NAMES[parseInt(m, 10)]} ${y}`;
}

export function MetasESonhosScreen({ onClose, isModal }) {
  const { colors } = useTheme();
  const {
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    addDeposit,
    getTotalSavedForGoal,
    getDepositsByMonth,
  } = useGoals();
  const [modalGoal, setModalGoal] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [photoUris, setPhotoUris] = useState([]);
  const [depositAmount, setDepositAmount] = useState({});

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão', 'Precisamos de acesso à galeria.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUris((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removePhoto = (idx) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== idx));
  };

  const openNew = () => {
    playTapSound();
    setModalGoal({ id: null });
    setEditTitle('');
    setEditTarget('');
    setEditDesc('');
    setPhotoUris([]);
  };

  const formatForMoneyInput = (n) => (Math.round((n || 0) * 100) / 100).toFixed(2).replace('.', ',');

  const openEdit = (goal) => {
    playTapSound();
    setModalGoal(goal);
    setEditTitle(goal.title || '');
    setEditTarget(goal.targetValue > 0 ? formatForMoneyInput(goal.targetValue) : '');
    setEditDesc(goal.description || '');
    setPhotoUris(goal.photoUris || []);
  };

  const handleSave = () => {
    const target = parseMoney(editTarget) || 0;
    if (!editTitle.trim()) return Alert.alert('Erro', 'Digite o título da meta.');
    if (target <= 0) return Alert.alert('Erro', 'Digite o valor da meta.');
    if (modalGoal?.id) {
      updateGoal(modalGoal.id, { title: editTitle.trim(), targetValue: target, description: editDesc.trim(), photoUris });
    } else {
      addGoal({ title: editTitle.trim(), targetValue: target, description: editDesc.trim(), photoUris });
    }
    playTapSound();
    setModalGoal(null);
  };

  const handleDelete = (goal) => {
    playTapSound();
    Alert.alert('Excluir', 'Quer excluir esta meta? Os valores guardados serão perdidos.', [
      { text: 'Cancelar' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteGoal(goal.id) },
    ]);
  };

  const handleDeposit = (goalId) => {
    const val = depositAmount[goalId];
    const amt = typeof val === 'string' ? parseMoney(val) : Number(val);
    if (!amt || amt <= 0) return Alert.alert('Erro', 'Digite um valor para guardar.');
    addDeposit(goalId, amt);
    setDepositAmount((prev) => ({ ...prev, [goalId]: '' }));
    playTapSound();
  };

  const maxByMonth = (items) => Math.max(1, ...items.map(([, v]) => v));

  return (
    <SafeAreaView style={[mes.container, { backgroundColor: colors.bg }]}>
      <View style={[topBarStyles.bar, { backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        <Text style={[topBarStyles.title, { color: colors.text }]}>Metas e sonhos</Text>
        {isModal && (
          <TouchableOpacity onPress={() => { playTapSound(); onClose?.(); }} style={[topBarStyles.menuBtn, { backgroundColor: 'transparent' }]}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={mes.section}>
          <TouchableOpacity
            onPress={openNew}
            style={[mes.addBtn, { borderColor: colors.primary + '60', backgroundColor: colors.primaryRgba?.(0.08) || colors.primary + '15' }]}
          >
            <AppIcon name="add-circle-outline" size={24} color={colors.primary} />
            <Text style={[mes.addBtnText, { color: colors.primary }]}>Nova meta ou sonho</Text>
          </TouchableOpacity>

          {goals.length === 0 ? (
            <View style={mes.empty}>
              <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primaryRgba?.(0.15) || colors.primary + '25', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="heart" size={48} color={colors.primary} />
              </View>
              <Text style={[mes.emptyText, { color: colors.text }]}>Nenhuma meta cadastrada</Text>
              <Text style={[mes.emptyText, { color: colors.textSecondary, fontSize: 13, textAlign: 'center' }]}>
                Crie metas como "Carro novo", "Viagem", "Casa própria" e vá guardando mês a mês no cofrinho
              </Text>
            </View>
          ) : (
            goals.map((goal) => {
              const totalSaved = getTotalSavedForGoal(goal.id);
              const target = goal.targetValue || 1;
              const pct = Math.min(100, (totalSaved / target) * 100);
              const byMonth = getDepositsByMonth(goal.id);
              const maxVal = maxByMonth(byMonth);

              return (
                <GlassCard key={goal.id} colors={colors} style={[mes.goalCard, { borderColor: colors.border }]}>
                  <TouchableOpacity onPress={() => openEdit(goal)} activeOpacity={1}>
                    <View style={[mes.goalPhoto, { backgroundColor: colors.primaryRgba?.(0.2) || colors.primary + '30' }]}>
                      {goal.photoUris?.[0] ? (
                        <Image source={{ uri: goal.photoUris[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <View style={[mes.goalPhotoPlaceholder, { backgroundColor: colors.primaryRgba?.(0.3) || colors.primary + '40' }]}>
                          <Ionicons name="heart" size={40} color={colors.primary} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  <View style={[mes.goalBody, { backgroundColor: colors.card }]}>
                    <Text style={[mes.goalTitle, { color: colors.text }]}>{goal.title}</Text>
                    <Text style={[mes.goalTarget, { color: colors.primary }]}>{formatCurrency(target)}</Text>
                    {goal.description ? (
                      <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8 }} numberOfLines={2}>{goal.description}</Text>
                    ) : null}

                    <View style={mes.progressWrap}>
                      <LinearGradient
                        colors={[colors.primary, colors.primary + 'CC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[mes.progressFill, { width: `${pct}%` }]}
                      />
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                      {formatCurrency(totalSaved)} de {formatCurrency(target)} · {pct.toFixed(0)}%
                    </Text>

                    <View style={[mes.cofrinhoRow, { marginTop: 12 }]}>
                      <View style={{ flex: 1 }}>
                        <MoneyInput
                          value={depositAmount[goal.id] ?? ''}
                          onChange={(v) => setDepositAmount((prev) => ({ ...prev, [goal.id]: v }))}
                          placeholder="Quanto guardou este mês?"
                          colors={colors}
                          containerStyle={{ flex: 1 }}
                        />
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeposit(goal.id)}
                        style={[mes.cofrinhoBtn, { backgroundColor: colors.primary }]}
                      >
                        <Ionicons name="add" size={20} color="#fff" />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Guardar</Text>
                      </TouchableOpacity>
                    </View>

                    {byMonth.length > 0 && (
                      <>
                        <Text style={[mes.historyTitle, { color: colors.textSecondary }]}>Gráfico por mês</Text>
                        {byMonth.slice(0, 6).map(([monthKey, val]) => (
                          <View key={monthKey} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, width: 50 }}>{formatMonthKey(monthKey)}</Text>
                            <View style={[mes.chartBar, { flex: 1, backgroundColor: colors.border + '60' }]}>
                              <LinearGradient
                                colors={[colors.primary + '99', colors.primary]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[mes.progressFill, { width: `${(val / maxVal) * 100}%` }]}
                              />
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{formatCurrency(val)}</Text>
                          </View>
                        ))}
                      </>
                    )}

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                      <TouchableOpacity onPress={() => openEdit(goal)} style={{ padding: 8 }}>
                        <Ionicons name="pencil" size={22} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(goal)} style={{ padding: 8 }}>
                        <Ionicons name="trash-outline" size={22} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </GlassCard>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!modalGoal} transparent animationType="slide">
        <KeyboardAvoidingView style={mes.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setModalGoal(null); }} />
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[mes.modalContent, { backgroundColor: colors.card }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={[mes.modalTitle, { color: colors.text, marginBottom: 0 }]}>{modalGoal?.id ? 'Editar meta' : 'Nova meta ou sonho'}</Text>
                <TouchableOpacity onPress={() => { Keyboard.dismiss(); setModalGoal(null); }} hitSlop={12}>
                  <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Fotos (opcional)</Text>
              <View style={[mes.photoRow, { marginBottom: 16 }]}>
                {photoUris.map((uri, idx) => (
                  <TouchableOpacity key={idx} onPress={() => removePhoto(idx)} style={mes.photoThumb}>
                    <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={pickImage} style={[mes.photoAdd, { borderColor: colors.primary + '80' }]}>
                  <Ionicons name="add" size={28} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={mes.modalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Título</Text>
                <TextInput
                  placeholder="Ex: Carro novo, Viagem, Casa própria"
                  placeholderTextColor={colors.textSecondary + '99'}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  style={[mes.input, { borderColor: colors.border, color: colors.text }]}
                />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Valor da meta</Text>
                <MoneyInput
                  value={editTarget}
                  onChange={setEditTarget}
                  placeholder="0,00"
                  colors={colors}
                  containerStyle={{ marginBottom: 12 }}
                />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Descrição (opcional)</Text>
                <TextInput
                  placeholder="Detalhes da sua meta..."
                  placeholderTextColor={colors.textSecondary + '99'}
                  value={editDesc}
                  onChangeText={setEditDesc}
                  multiline
                  style={[mes.input, mes.textArea, { borderColor: colors.border, color: colors.text }]}
                />
              </ScrollView>
              <View style={mes.modalActions}>
              <TouchableOpacity style={[mes.modalBtn, { backgroundColor: colors.border }]} onPress={() => { playTapSound(); setModalGoal(null); }}>
                <Text style={{ fontWeight: '600', color: colors.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[mes.modalBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
                <Text style={{ fontWeight: '600', color: '#fff' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
