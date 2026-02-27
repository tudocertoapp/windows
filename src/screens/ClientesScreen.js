import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../contexts/FinanceContext';
import { useTheme } from '../contexts/ThemeContext';
import { TopBar } from '../components/TopBar';
import { ClienteModal } from '../components/ClienteModal';
import { formatCurrency } from '../utils/format';

const cls = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  addBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700' },
  cardInfo: { fontSize: 13, marginTop: 2, color: '#6b7280' },
  crmRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  crmBox: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  crmNum: { fontSize: 18, fontWeight: '800' },
  crmLabel: { fontSize: 10, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { padding: 8, borderRadius: 8 },
});

const NIVEL_LABELS = { orcamento: 'Orçamento', lead: 'Lead', fechou: 'Fechou' };
const NIVEL_COLORS = { orcamento: '#6b7280', lead: '#f59e0b', fechou: '#10b981' };

export function ClientesScreen({ onClose, isModal }) {
  const { clients, agendaEvents, addClient, updateClient, deleteClient } = useFinance();
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const handleSave = (data) => {
    if (editingClient) {
      updateClient(editingClient.id, data);
    } else {
      addClient(data);
    }
    setEditingClient(null);
    setModalVisible(false);
  };

  const openEdit = (c) => {
    setEditingClient(c);
    setModalVisible(true);
  };

  const openAdd = () => {
    setEditingClient(null);
    setModalVisible(true);
  };

  const clientesComAgendamentos = useMemo(() => {
    return clients.map((c) => ({
      ...c,
      agendamentos: agendaEvents.filter((e) => e.clientId === c.id).length,
      concluidos: agendaEvents.filter((e) => e.clientId === c.id && e.status === 'concluido').length,
      totalRecebido: agendaEvents.filter((e) => e.clientId === c.id && e.status === 'concluido').reduce((s, e) => s + (e.amount || 0), 0),
    }));
  }, [clients, agendaEvents]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {isModal && onClose ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, backgroundColor: colors.card, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Clientes</Text>
          <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TopBar title="Clientes" colors={colors} hideOrganize />
      )}
      <View style={[cls.header, { backgroundColor: colors.bg, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>CRM — {clients.length} clientes</Text>
        <TouchableOpacity style={[cls.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      {clients.length === 0 ? (
        <View style={cls.empty}>
          <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
          <Text style={{ fontSize: 15, color: colors.textSecondary }}>Nenhum cliente cadastrado</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ paddingTop: 12 }}>
          {clientesComAgendamentos.map((c) => (
            <View key={c.id} style={[cls.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {c.foto ? (
                <Image source={{ uri: c.foto }} style={[cls.avatar, { backgroundColor: colors.primaryRgba(0.2) }]} resizeMode="cover" />
              ) : (
                <View style={[cls.avatar, { backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="person" size={28} color={colors.primary} />
                </View>
              )}
              <View style={cls.cardBody}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={[cls.cardName, { color: colors.text }]}>{c.name}</Text>
                  {c.nivel && (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: (NIVEL_COLORS[c.nivel] || colors.border) + '30' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: NIVEL_COLORS[c.nivel] || colors.text }}>{NIVEL_LABELS[c.nivel] || c.nivel}</Text>
                    </View>
                  )}
                </View>
                {c.email ? <Text style={[cls.cardInfo, { color: colors.textSecondary }]}>{c.email}</Text> : null}
                {c.phone ? <Text style={[cls.cardInfo, { color: colors.textSecondary }]}>{c.phone}</Text> : null}
                <View style={cls.crmRow}>
                  <View style={[cls.crmBox, { backgroundColor: colors.primaryRgba(0.15) }]}>
                    <Text style={[cls.crmNum, { color: colors.primary }]}>{c.agendamentos || 0}</Text>
                    <Text style={[cls.crmLabel, { color: colors.textSecondary }]}>Agendados</Text>
                  </View>
                  <View style={[cls.crmBox, { backgroundColor: colors.primaryRgba(0.15) }]}>
                    <Text style={[cls.crmNum, { color: colors.primary }]}>{c.concluidos || 0}</Text>
                    <Text style={[cls.crmLabel, { color: colors.textSecondary }]}>Concluídos</Text>
                  </View>
                  <View style={[cls.crmBox, { backgroundColor: colors.primaryRgba(0.15) }]}>
                    <Text style={[cls.crmNum, { color: colors.primary, fontSize: 14 }]}>{formatCurrency(c.totalRecebido || 0)}</Text>
                    <Text style={[cls.crmLabel, { color: colors.textSecondary }]}>Recebido</Text>
                  </View>
                </View>
                <View style={cls.actionRow}>
                  <TouchableOpacity onPress={() => openEdit(c)} style={[cls.actionBtn, { backgroundColor: colors.primaryRgba(0.2) }]}>
                    <Ionicons name="pencil" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('Excluir', 'Remover este cliente?', [
                        { text: 'Cancelar' },
                        { text: 'Excluir', style: 'destructive', onPress: () => deleteClient(c.id) },
                      ])
                    }
                    style={[cls.actionBtn, { backgroundColor: 'rgba(239,68,68,0.2)' }]}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
      <ClienteModal visible={modalVisible} cliente={editingClient} onSave={handleSave} onClose={() => { setModalVisible(false); setEditingClient(null); }} />
    </SafeAreaView>
  );
}
