import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { openWhatsApp } from '../utils/whatsapp';
import { PessoaModal } from '../components/PessoaModal';
import { ClienteModal } from '../components/ClienteModal';
import { playTapSound } from '../utils/sounds';

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  addBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700' },
  cardInfo: { fontSize: 13, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
});

const parseBirthDate = (str) => {
  if (!str || !String(str).trim()) return null;
  const parts = String(str).trim().split(/[/\-]/);
  if (parts.length < 2) return null;
  const day = parseInt(parts[0], 10) || 1;
  const month = (parseInt(parts[1], 10) || 1) - 1;
  const year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear();
  return new Date(year, month, day);
};

export function AniversariantesScreen({ onClose, isModal }) {
  const { clients, addClient, updateClient, deleteClient } = useFinance();
  const { colors } = useTheme();
  const { viewMode, showEmpresaFeatures } = usePlan();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const isEmpresa = showEmpresaFeatures && viewMode === 'empresa';
  const lista = useMemo(() => {
    let items = clients.filter((c) => (c.tipo || 'empresa') === (isEmpresa ? 'empresa' : 'pessoal'));
    if (isEmpresa) items = items.filter((c) => (c.birthDate || c.dataNascimento)?.trim());
    const h = new Date();
    return [...items].sort((a, b) => {
      const da = parseBirthDate(a.birthDate || a.dataNascimento);
      const db = parseBirthDate(b.birthDate || b.dataNascimento);
      if (!da || !db) return 0;
      const aThisYear = new Date(h.getFullYear(), da.getMonth(), da.getDate()).getTime();
      const bThisYear = new Date(h.getFullYear(), db.getMonth(), db.getDate()).getTime();
      return aThisYear - bThisYear;
    });
  }, [clients, isEmpresa]);

  const handleSavePessoa = (data) => {
    if (editingClient) {
      updateClient(editingClient.id, { ...data, tipo: 'pessoal' });
    } else {
      addClient({ ...data, tipo: 'pessoal' });
    }
    setEditingClient(null);
    setModalVisible(false);
  };

  const handleSaveCliente = (data) => {
    if (editingClient) {
      updateClient(editingClient.id, { ...data, tipo: 'empresa' });
    } else {
      addClient({ ...data, tipo: 'empresa' });
    }
    setEditingClient(null);
    setModalVisible(false);
  };

  const formatBirthDate = (str) => {
    if (!str || !String(str).trim()) return null;
    const parts = String(str).trim().split(/[/\-]/);
    if (parts.length < 2) return str;
    const d = parts[0]?.padStart(2, '0') || '00';
    const m = parts[1]?.padStart(2, '0') || '00';
    const a = parts[2] || '';
    return a ? `${d}/${m}/${a}` : `${d}/${m}`;
  };

  const getDiaLabel = (str) => {
    const d = parseBirthDate(str);
    if (!d) return null;
    const hoje = new Date();
    const bd = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.floor((bd - hoje) / (24 * 60 * 60 * 1000));
    if (diff === 0) return 'hoje';
    if (diff === 1) return 'amanhã';
    return null;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {isModal && onClose ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, backgroundColor: colors.card, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Cadastro de aniversariantes</Text>
          <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryRgba?.(0.2), justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, backgroundColor: colors.card, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Cadastro de aniversariantes</Text>
        </View>
      )}
      <View style={[s.header, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>{isEmpresa ? `Clientes (empresa) · ${lista.length}` : `Família e amigos (pessoal) · ${lista.length}`}</Text>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={() => { playTapSound(); setEditingClient(null); setModalVisible(true); }}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      {lista.length === 0 ? (
        <View style={[s.empty, { flex: 1 }]}>
          <Ionicons name="gift-outline" size={56} color={colors.textSecondary} />
          <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 }}>
            {isEmpresa ? 'Nenhum cliente com data de nascimento. Cadastre em WhatsApp e CRM.' : 'Nenhuma pessoa cadastrada. Toque em + para adicionar família e amigos.'}
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {lista.map((c) => {
            const bd = c.birthDate || c.dataNascimento;
            const diaLabel = getDiaLabel(bd);
            const dataStr = bd ? `🎂 ${formatBirthDate(bd)}${diaLabel ? ` · ${diaLabel}` : ''}` : null;
            return (
            <View key={c.id} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {c.foto ? (
                <Image source={{ uri: c.foto }} style={[s.avatar, { backgroundColor: colors.primaryRgba?.(0.2) }]} resizeMode="cover" />
              ) : (
                <View style={[s.avatar, { backgroundColor: colors.primaryRgba?.(0.2), justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="person" size={28} color={colors.primary} />
                </View>
              )}
              <View style={s.cardBody}>
                <Text style={[s.cardName, { color: colors.text }]}>{c.name}</Text>
                {dataStr && <Text style={[s.cardInfo, { color: colors.textSecondary }]}>{dataStr}</Text>}
                {c.phone && <Text style={[s.cardInfo, { color: colors.textSecondary }]}>{c.phone}</Text>}
                <View style={s.actionRow}>
                  <TouchableOpacity onPress={() => { playTapSound(); setEditingClient(c); setModalVisible(true); }} style={[s.actionBtn, { backgroundColor: 'transparent' }]}>
                    <Ionicons name="pencil" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  {c.phone?.trim() && (
                    <TouchableOpacity onPress={() => { playTapSound(); openWhatsApp(c.phone); }} style={[s.actionBtn, { backgroundColor: 'transparent' }]}>
                      <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => Alert.alert('Excluir', isEmpresa ? 'Remover este cliente?' : 'Remover esta pessoa?', [{ text: 'Cancelar' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteClient(c.id) }])}
                    style={[s.actionBtn, { backgroundColor: 'transparent' }]}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            );
          })}
        </ScrollView>
      )}
      {isEmpresa ? (
        <ClienteModal visible={modalVisible} cliente={editingClient} defaultTipo="empresa" onSave={handleSaveCliente} onClose={() => { setModalVisible(false); setEditingClient(null); }} />
      ) : (
        <PessoaModal visible={modalVisible} pessoa={editingClient} onSave={handleSavePessoa} onClose={() => { setModalVisible(false); setEditingClient(null); }} />
      )}
    </SafeAreaView>
  );
}
