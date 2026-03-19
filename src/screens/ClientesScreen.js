import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../contexts/FinanceContext';
import { useMenu } from '../contexts/MenuContext';
import { openWhatsApp } from '../utils/whatsapp';
import { useTheme } from '../contexts/ThemeContext';
import { TopBar } from '../components/TopBar';
import { ClienteModal } from '../components/ClienteModal';
import { ClienteDetalheModal } from '../components/ClienteDetalheModal';
import { formatCurrency } from '../utils/format';
import { playTapSound } from '../utils/sounds';

const cls = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  addBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700' },
  cardInfo: { fontSize: 13, marginTop: 2, color: '#6b7280' },
  crmRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  crmBox: { flex: 1, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 8, alignItems: 'center', justifyContent: 'center', minHeight: 44, backgroundColor: 'transparent' },
  crmNum: { fontSize: 14, fontWeight: '800' },
  crmLabel: { fontSize: 9, marginTop: 1 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { padding: 8, borderRadius: 8 },
});

const NIVEL_OPTIONS = [
  { id: 'novo_cliente', label: 'Novo cliente', color: '#84cc16' },
  { id: 'orcamento', label: 'Orçamento', color: '#6b7280' },
  { id: 'proposta', label: 'Proposta', color: '#8b5cf6' },
  { id: 'agendado', label: 'Agendado', color: '#0ea5e9' },
  { id: 'fixo', label: 'Fixo', color: '#10b981' },
  { id: 'lead', label: 'Lead', color: '#f59e0b' },
  { id: 'fechou', label: 'Fechou', color: '#10b981' },
];

export function ClientesScreen({ onClose, isModal }) {
  const { clients, agendaEvents, services, addClient, updateClient, deleteClient } = useFinance();
  const { colors } = useTheme();
  const { openMensagensWhatsApp } = useMenu();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [verClienteDetalhe, setVerClienteDetalhe] = useState(null);

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
    return clients.filter((c) => (c.tipo || 'empresa') === 'empresa').map((c) => ({
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
      <View style={[cls.header, { backgroundColor: colors.bg, borderBottomColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>CRM — {clientesComAgendamentos.length} clientes</Text>
          <TouchableOpacity style={[cls.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        {clientesComAgendamentos.some((c) => c.phone?.trim()) && (
          <TouchableOpacity
            onPress={() => openMensagensWhatsApp?.()}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#25D36620', borderWidth: 1, borderColor: '#25D36660', minHeight: 44 }}
          >
            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#25D366' }}>Conversar com clientes no WhatsApp</Text>
          </TouchableOpacity>
        )}
      </View>
      {clientesComAgendamentos.length === 0 ? (
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
                <View style={[cls.avatar, { backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="person" size={28} color={colors.primary} />
                </View>
              )}
              <View style={cls.cardBody}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={[cls.cardName, { color: colors.text }]}>{c.name}</Text>
                  {c.nivel && (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: ((NIVEL_OPTIONS.find((o) => o.id === c.nivel))?.color || colors.border) + '30' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: (NIVEL_OPTIONS.find((o) => o.id === c.nivel))?.color || colors.text }}>{(NIVEL_OPTIONS.find((o) => o.id === c.nivel))?.label || c.nivel}</Text>
                    </View>
                  )}
                </View>
                {c.email ? <Text style={[cls.cardInfo, { color: colors.textSecondary }]}>{c.email}</Text> : null}
                {c.phone ? <Text style={[cls.cardInfo, { color: colors.textSecondary }]}>{c.phone}</Text> : null}
                <View style={cls.actionRow}>
                  <TouchableOpacity onPress={() => { playTapSound(); setVerClienteDetalhe(c); }} style={[cls.actionBtn, { backgroundColor: 'transparent' }]}>
                    <Ionicons name="eye-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openEdit(c)} style={[cls.actionBtn, { backgroundColor: 'transparent' }]}>
                    <Ionicons name="pencil" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  {c.phone?.trim() ? (
                    <TouchableOpacity onPress={() => openWhatsApp(c.phone)} style={[cls.actionBtn, { backgroundColor: 'transparent' }]}>
                      <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('Excluir', 'Remover este cliente?', [
                        { text: 'Cancelar' },
                        { text: 'Excluir', style: 'destructive', onPress: () => deleteClient(c.id) },
                      ])
                    }
                    style={[cls.actionBtn, { backgroundColor: 'transparent' }]}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
      <ClienteDetalheModal
        visible={!!verClienteDetalhe}
        cliente={verClienteDetalhe}
        agendaEvents={agendaEvents}
        services={services}
        colors={colors}
        onClose={() => setVerClienteDetalhe(null)}
        onEdit={() => { setVerClienteDetalhe(null); setEditingClient(verClienteDetalhe); setModalVisible(true); }}
        onConversar={() => { if (verClienteDetalhe?.phone) openWhatsApp(verClienteDetalhe.phone); setVerClienteDetalhe(null); }}
      />
      <ClienteModal visible={modalVisible} cliente={editingClient} defaultTipo="empresa" onSave={handleSave} onClose={() => { setModalVisible(false); setEditingClient(null); }} />
    </SafeAreaView>
  );
}
