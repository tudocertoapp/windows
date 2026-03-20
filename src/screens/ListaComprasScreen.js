import React, { useState, useMemo } from 'react';
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
import { AppIcon } from '../components/AppIcon';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { useShoppingList } from '../contexts/ShoppingListContext';
import { useFinance } from '../contexts/FinanceContext';
import { topBarStyles } from '../components/TopBar';
import { GlassCard } from '../components/GlassCard';
import { playTapSound } from '../utils/sounds';

const lcs = StyleSheet.create({
  container: { flex: 1 },
  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', marginBottom: 20 },
  addBtnText: { fontSize: 15, fontWeight: '700' },
  headerTabs: { flexDirection: 'row', gap: 8, marginTop: 12 },
  headerTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  headerTabText: { fontSize: 14, fontWeight: '600' },
  itemCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  itemContent: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  itemDate: { fontSize: 12, marginTop: 4 },
  itemActions: { flexDirection: 'row', gap: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '85%' },
  photoRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  photoThumb: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden' },
  photoAdd: { width: 72, height: 72, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 15 },
  convertBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginTop: 12 },
});

function formatDateStr(str) {
  if (!str || !String(str).trim()) return 'Sem data';
  const parts = String(str).trim().split(/[/\-]/);
  if (parts.length < 3) return str;
  let day, month, year;
  if (parts[0].length === 4) {
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  }
  if (isNaN(day) || isNaN(month) || isNaN(year)) return str;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ListaComprasScreen({ onClose, isModal }) {
  const { colors } = useTheme();
  const { showEmpresaFeatures } = usePlan();
  const { items, addItem, updateItem, deleteItem } = useShoppingList();
  const { addCheckListItem } = useFinance();
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [modalItem, setModalItem] = useState(null);
  const [modalTipo, setModalTipo] = useState('pessoal');
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [photoUris, setPhotoUris] = useState([]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão', 'Precisamos de acesso à galeria.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUris((prev) => [...prev, result.assets[0].uri]);
  };

  const removePhoto = (idx) => setPhotoUris((prev) => prev.filter((_, i) => i !== idx));

  const filteredItems = useMemo(() => {
    if (filtroTipo === 'todos') return items;
    return items.filter((i) => (i.tipo || 'pessoal') === filtroTipo);
  }, [items, filtroTipo]);

  const openNew = () => {
    playTapSound();
    const hoje = new Date();
    const dateStr = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
    setModalItem({ id: null, tipo: null });
    setModalTipo(filtroTipo === 'todos' ? 'pessoal' : filtroTipo);
    setEditTitle('');
    setEditDate(dateStr);
    setPhotoUris([]);
  };

  const openEdit = (item) => {
    playTapSound();
    setModalItem(item);
    setModalTipo(item.tipo || 'pessoal');
    setEditTitle(item.title || '');
    setEditDate(item.date || '');
    setPhotoUris(item.photoUris || []);
  };

  const handleSave = () => {
    const payload = { title: editTitle, date: editDate.trim() || null, photoUris };
    if (modalItem?.id) {
      updateItem(modalItem.id, { ...payload, tipo: modalTipo });
    } else {
      addItem({ ...payload, tipo: modalTipo });
    }
    playTapSound();
    setModalItem(null);
  };

  const handleDelete = (item) => {
    playTapSound();
    Alert.alert('Excluir', 'Quer excluir este item da lista?', [
      { text: 'Cancelar' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteItem(item.id) },
    ]);
  };

  const handleConvertToTask = (item) => {
    playTapSound();
    addCheckListItem({
      title: item.title,
      date: item.date || undefined,
      checked: false,
      important: false,
      priority: 'media',
    });
    deleteItem(item.id);
    Alert.alert('Pronto!', 'Item convertido em tarefa. Você pode visualizá-lo em Tarefas.', [{ text: 'OK' }]);
  };

  const toggleCheck = (item) => {
    playTapSound();
    updateItem(item.id, { checked: !item.checked });
  };

  return (
    <SafeAreaView style={[lcs.container, { backgroundColor: colors.bg }]}>
      <View style={[topBarStyles.bar, { backgroundColor: colors.bg, flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[topBarStyles.title, { color: colors.text }]}>Lista de compras</Text>
          {isModal && (
            <TouchableOpacity onPress={() => { playTapSound(); onClose?.(); }} style={[topBarStyles.menuBtn, { backgroundColor: 'transparent' }]}>
              <Ionicons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
        <View style={lcs.headerTabs}>
          <TouchableOpacity
            style={[
              lcs.headerTab,
              {
                borderColor: filtroTipo === 'todos' ? colors.primary : colors.border,
                backgroundColor: filtroTipo === 'todos' ? (colors.primaryRgba?.(0.15) ?? colors.primary + '25') : 'transparent',
              },
            ]}
            onPress={() => { playTapSound(); setFiltroTipo('todos'); }}
          >
            <Ionicons name="list" size={18} color={filtroTipo === 'todos' ? colors.primary : colors.textSecondary} />
            <Text style={[lcs.headerTabText, { color: filtroTipo === 'todos' ? colors.primary : colors.textSecondary }]}>Todos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              lcs.headerTab,
              {
                borderColor: filtroTipo === 'pessoal' ? colors.primary : colors.border,
                backgroundColor: filtroTipo === 'pessoal' ? (colors.primaryRgba?.(0.15) ?? colors.primary + '25') : 'transparent',
              },
            ]}
            onPress={() => { playTapSound(); setFiltroTipo('pessoal'); }}
          >
            <Ionicons name="person-outline" size={18} color={filtroTipo === 'pessoal' ? colors.primary : colors.textSecondary} />
            <Text style={[lcs.headerTabText, { color: filtroTipo === 'pessoal' ? colors.primary : colors.textSecondary }]}>Pessoal</Text>
          </TouchableOpacity>
          {showEmpresaFeatures && (
            <TouchableOpacity
              style={[
                lcs.headerTab,
                {
                  borderColor: filtroTipo === 'empresa' ? '#6366f1' : colors.border,
                  backgroundColor: filtroTipo === 'empresa' ? 'rgba(99,102,241,0.15)' : 'transparent',
                },
              ]}
              onPress={() => { playTapSound(); setFiltroTipo('empresa'); }}
            >
              <Ionicons name="business-outline" size={18} color={filtroTipo === 'empresa' ? '#6366f1' : colors.textSecondary} />
              <Text style={[lcs.headerTabText, { color: filtroTipo === 'empresa' ? '#6366f1' : colors.textSecondary }]}>Empresa</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={lcs.section}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={openNew}
              style={[lcs.addBtn, { borderColor: colors.primary + '60', backgroundColor: colors.primaryRgba?.(0.08) || colors.primary + '15', flex: 1, minWidth: 140 }]}
            >
              <AppIcon name="add-circle-outline" size={24} color={colors.primary} />
              <Text style={[lcs.addBtnText, { color: colors.primary }]}>Adicionar item</Text>
            </TouchableOpacity>
          </View>

          {filteredItems.length === 0 ? (
            <View style={lcs.empty}>
              <AppIcon name="cart-outline" size={56} color={colors.textSecondary} />
              <Text style={[lcs.emptyText, { color: colors.textSecondary }]}>Nenhum item na lista</Text>
              <Text style={[lcs.emptyText, { color: colors.textSecondary, fontSize: 13 }]}>Toque em "Adicionar item" para anotar o que precisa comprar</Text>
            </View>
          ) : (
            filteredItems.map((item) => (
              <GlassCard key={item.id} colors={colors} style={[lcs.itemCard, { borderColor: colors.border, opacity: item.checked ? 0.85 : 1 }]}>
                <View style={lcs.itemRow}>
                  <TouchableOpacity
                    onPress={() => toggleCheck(item)}
                    style={[
                      lcs.checkbox,
                      {
                        borderColor: item.checked ? colors.primary : colors.border,
                        backgroundColor: item.checked ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {item.checked && <Ionicons name="checkmark" size={18} color="#fff" />}
                  </TouchableOpacity>
                  {item.photoUris?.[0] ? (
                    <Image source={{ uri: item.photoUris[0] }} style={{ width: 48, height: 48, borderRadius: 10 }} resizeMode="cover" />
                  ) : null}
                  <View style={lcs.itemContent}>
                    <Text style={[lcs.itemTitle, { color: colors.text, textDecorationLine: item.checked ? 'line-through' : 'none' }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.date && (
                      <Text style={[lcs.itemDate, { color: colors.textSecondary }]}>{formatDateStr(item.date)}</Text>
                    )}
                    {item.checked && (
                      <Text style={{ fontSize: 11, color: colors.primary, marginTop: 2, fontWeight: '600' }}>Concluído</Text>
                    )}
                  </View>
                  <View style={lcs.itemActions}>
                    <TouchableOpacity onPress={() => openEdit(item)} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="pencil" size={22} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item)} style={{ padding: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={22} color="#ef4444" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleConvertToTask(item)}
                      style={[lcs.convertBtn, { backgroundColor: colors.primaryRgba?.(0.12) ?? colors.primary + '20', borderWidth: 1, borderColor: colors.primary + '40', marginTop: 0 }]}
                    >
                      <Ionicons name="checkbox-outline" size={18} color={colors.primary} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Virar tarefa</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </GlassCard>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!modalItem} transparent animationType="slide">
        <KeyboardAvoidingView style={lcs.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setModalItem(null); }} />
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[lcs.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={[lcs.modalTitle, { color: colors.text, marginBottom: 0 }]}>{modalItem?.id ? 'Editar item' : 'Novo item'}</Text>
                <TouchableOpacity onPress={() => { Keyboard.dismiss(); setModalItem(null); }} hitSlop={12}>
                  <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {(
                <>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Tipo</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    <TouchableOpacity
                      onPress={() => { playTapSound(); setModalTipo('pessoal'); }}
                      style={[
                        lcs.headerTab,
                        { flex: 1, marginBottom: 0 },
                        { borderColor: modalTipo === 'pessoal' ? colors.primary : colors.border, backgroundColor: modalTipo === 'pessoal' ? (colors.primaryRgba?.(0.15) ?? colors.primary + '25') : 'transparent' },
                      ]}
                    >
                      <Ionicons name="person-outline" size={18} color={modalTipo === 'pessoal' ? colors.primary : colors.textSecondary} />
                      <Text style={[lcs.headerTabText, { color: modalTipo === 'pessoal' ? colors.primary : colors.textSecondary }]}>Pessoal</Text>
                    </TouchableOpacity>
                    {showEmpresaFeatures && (
                      <TouchableOpacity
                        onPress={() => { playTapSound(); setModalTipo('empresa'); }}
                        style={[
                          lcs.headerTab,
                          { flex: 1, marginBottom: 0 },
                          { borderColor: modalTipo === 'empresa' ? '#6366f1' : colors.border, backgroundColor: modalTipo === 'empresa' ? 'rgba(99,102,241,0.15)' : 'transparent' },
                        ]}
                      >
                        <Ionicons name="business-outline" size={18} color={modalTipo === 'empresa' ? '#6366f1' : colors.textSecondary} />
                        <Text style={[lcs.headerTabText, { color: modalTipo === 'empresa' ? '#6366f1' : colors.textSecondary }]}>Empresa</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Foto (opcional)</Text>
              <View style={lcs.photoRow}>
                {photoUris.map((uri, idx) => (
                  <TouchableOpacity key={idx} onPress={() => removePhoto(idx)} style={lcs.photoThumb}>
                    <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={pickImage} style={[lcs.photoAdd, { borderColor: colors.primary + '80' }]}>
                  <Ionicons name="add" size={28} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>O que precisa comprar?</Text>
              <TextInput
                placeholder="Ex: Leite, Pão, Arroz..."
                placeholderTextColor={colors.textSecondary + '99'}
                value={editTitle}
                onChangeText={setEditTitle}
                style={[lcs.input, { borderColor: colors.border, color: colors.text }]}
                autoFocus
              />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Data para comprar</Text>
              <TextInput
                placeholder="ex: 15/03/2025"
                placeholderTextColor={colors.textSecondary + '99'}
                value={editDate}
                onChangeText={setEditDate}
                style={[lcs.input, { borderColor: colors.border, color: colors.text }]}
              />
              <View style={lcs.modalActions}>
                <TouchableOpacity
                  style={[lcs.modalBtn, { backgroundColor: colors.border }]}
                  onPress={() => { playTapSound(); Keyboard.dismiss(); setModalItem(null); }}
                >
                  <Text style={{ fontWeight: '600', color: colors.text }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[lcs.modalBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSave}
                >
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
