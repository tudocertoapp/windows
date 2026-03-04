import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppIcon } from '../components/AppIcon';
import { useTheme } from '../contexts/ThemeContext';
import { useNotes } from '../contexts/NotesContext';
import { topBarStyles } from '../components/TopBar';
import { GlassCard } from '../components/GlassCard';
import { playTapSound } from '../utils/sounds';

const ans = StyleSheet.create({
  container: { flex: 1 },
  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', marginBottom: 20 },
  addBtnText: { fontSize: 15, fontWeight: '700' },
  noteCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  noteTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  notePreview: { fontSize: 14, lineHeight: 20, opacity: 0.9 },
  noteMeta: { fontSize: 11, marginTop: 8, opacity: 0.7 },
  noteActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12 },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 15 },
});

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dm = new Date(d);
  dm.setHours(0, 0, 0, 0);
  if (dm.getTime() === hoje.getTime()) {
    return `Hoje, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function AnotacoesScreen({ onClose, isModal, initialEditNoteId, initialCreate }) {
  const { colors } = useTheme();
  const { notes, addNote, updateNote, deleteNote } = useNotes();
  const [modalNote, setModalNote] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const appliedInitialRef = useRef(false);
  useEffect(() => {
    if (appliedInitialRef.current) return;
    if (initialCreate) {
      appliedInitialRef.current = true;
      setModalNote({ id: null });
      setEditTitle('');
      setEditContent('');
    } else if (initialEditNoteId && notes.length > 0) {
      const note = notes.find((n) => n.id === initialEditNoteId);
      if (note) {
        appliedInitialRef.current = true;
        setModalNote(note);
        setEditTitle(note.title || '');
        setEditContent(note.content || '');
      }
    }
  }, [initialEditNoteId, initialCreate, notes]);

  const openNew = () => {
    playTapSound();
    setModalNote({ id: null });
    setEditTitle('');
    setEditContent('');
  };

  const openEdit = (note) => {
    playTapSound();
    setModalNote(note);
    setEditTitle(note.title || '');
    setEditContent(note.content || '');
  };

  const handleSave = () => {
    if (modalNote?.id) {
      updateNote(modalNote.id, { title: editTitle, content: editContent });
    } else {
      addNote({ title: editTitle, content: editContent });
    }
    playTapSound();
    setModalNote(null);
  };

  const handleDelete = (note) => {
    playTapSound();
    Alert.alert('Excluir', 'Quer excluir esta anotação?', [
      { text: 'Cancelar' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteNote(note.id) },
    ]);
  };

  return (
    <SafeAreaView style={[ans.container, { backgroundColor: colors.bg }]}>
      <View style={[topBarStyles.bar, { backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        <Text style={[topBarStyles.title, { color: colors.text }]}>Minhas anotações</Text>
        {isModal && (
          <TouchableOpacity onPress={onClose} style={[topBarStyles.menuBtn, { backgroundColor: 'transparent' }]}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={ans.section}>
          <TouchableOpacity
            onPress={openNew}
            style={[ans.addBtn, { borderColor: colors.primary + '60', backgroundColor: colors.primaryRgba?.(0.08) || colors.primary + '15' }]}
          >
            <AppIcon name="add-circle-outline" size={24} color={colors.primary} />
            <Text style={[ans.addBtnText, { color: colors.primary }]}>Nova anotação</Text>
          </TouchableOpacity>

          {notes.length === 0 ? (
            <View style={ans.empty}>
              <AppIcon name="document-text-outline" size={56} color={colors.textSecondary} />
              <Text style={[ans.emptyText, { color: colors.textSecondary }]}>Nenhuma anotação ainda</Text>
              <Text style={[ans.emptyText, { color: colors.textSecondary, fontSize: 13 }]}>Toque em "Nova anotação" para criar</Text>
            </View>
          ) : (
            notes.map((note) => (
              <GlassCard key={note.id} colors={colors} style={[ans.noteCard, { borderColor: colors.border }]}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => openEdit(note)}>
                  <Text style={[ans.noteTitle, { color: colors.text }]} numberOfLines={1}>{note.title}</Text>
                  {note.content ? (
                    <Text style={[ans.notePreview, { color: colors.textSecondary }]} numberOfLines={3}>{note.content}</Text>
                  ) : null}
                  <Text style={[ans.noteMeta, { color: colors.textSecondary }]}>{formatDate(note.updatedAt || note.createdAt)}</Text>
                </TouchableOpacity>
                <View style={ans.noteActions}>
                  <TouchableOpacity onPress={() => openEdit(note)} style={{ padding: 8, borderRadius: 10, backgroundColor: colors.primaryRgba?.(0.15) || colors.primary + '20' }}>
                    <AppIcon name="pencil-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(note)} style={{ padding: 8, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.15)' }}>
                    <AppIcon name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!modalNote} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={ans.modalOverlay} activeOpacity={1} onPress={() => setModalNote(null)}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[ans.modalContent, { backgroundColor: colors.card }]}>
              <Text style={[ans.modalTitle, { color: colors.text }]}>{modalNote?.id ? 'Editar anotação' : 'Nova anotação'}</Text>
              <TextInput
                style={[ans.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                placeholder="Título"
                placeholderTextColor={colors.textSecondary}
                value={editTitle}
                onChangeText={setEditTitle}
              />
              <TextInput
                style={[ans.input, ans.textArea, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                placeholder="Conteúdo..."
                placeholderTextColor={colors.textSecondary}
                value={editContent}
                onChangeText={setEditContent}
                multiline
              />
              <View style={ans.modalActions}>
                <TouchableOpacity style={[ans.modalBtn, { backgroundColor: colors.border }]} onPress={() => setModalNote(null)}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[ans.modalBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
