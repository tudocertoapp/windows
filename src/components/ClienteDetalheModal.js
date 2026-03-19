import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/format';

const NIVEL_OPTIONS = [
  { id: 'novo_cliente', label: 'Novo cliente', color: '#84cc16' },
  { id: 'orcamento', label: 'Orçamento', color: '#6b7280' },
  { id: 'proposta', label: 'Proposta', color: '#8b5cf6' },
  { id: 'agendado', label: 'Agendado', color: '#0ea5e9' },
  { id: 'fixo', label: 'Fixo', color: '#10b981' },
  { id: 'lead', label: 'Lead', color: '#f59e0b' },
  { id: 'fechou', label: 'Fechou', color: '#10b981' },
];

export function ClienteDetalheModal({ visible, cliente, agendaEvents = [], services = [], onClose, onEdit, onConversar, onIdentificar, colors }) {
  if (!cliente) return null;
  const events = (agendaEvents || []).filter((e) => e.clientId === cliente.id);
  const normalizeStatus = (status) => String(status || '').trim().toLowerCase();
  const concluidos = events.filter((e) => e.status === 'concluido');
  const cancelados = events.filter((e) => {
    const st = normalizeStatus(e.status);
    return st === 'cancelado' || st === 'cancelada' || st === 'cancelled';
  });
  const remarcados = events.filter((e) => {
    const st = normalizeStatus(e.status);
    return st === 'remarcado' || st === 'remarcada' || st === 'reagendado' || st === 'reagendada';
  });
  const totalRecebido = concluidos.reduce((s, e) => s + (e.amount || 0), 0);
  const valorMedio = concluidos.length > 0 ? totalRecebido / concluidos.length : 0;
  const faturados = concluidos.filter((e) => (e.amount || 0) > 0);

  const getServiceName = (serviceId) => {
    if (!serviceId) return null;
    const s = (services || []).find((sv) => sv.id === serviceId);
    return s?.name || null;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[s.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[s.box, { backgroundColor: colors?.card || '#fff', borderColor: colors?.border }]}>
          <View style={s.header}>
            <Text style={[s.title, { color: colors?.text }]}>Dados do cliente</Text>
            <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors?.primaryRgba?.(0.2) }]} onPress={onClose}>
              <Ionicons name="close" size={22} color={colors?.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={s.scroll} showsVerticalScrollIndicator>
            <View style={s.avatarRow}>
              {cliente.foto ? (
                <Image source={{ uri: cliente.foto }} style={[s.avatar, { backgroundColor: colors?.primaryRgba?.(0.2) }]} resizeMode="cover" />
              ) : (
                <View style={[s.avatar, { backgroundColor: colors?.primaryRgba?.(0.2), justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="person" size={40} color={colors?.primary} />
                </View>
              )}
              <View style={[s.avatarInfo, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }]}>
                <Text style={[s.nome, { color: colors?.text, flex: 1, marginRight: 8 }]} numberOfLines={1}>{cliente.name}</Text>
                {onIdentificar ? (
                  <TouchableOpacity
                    style={[s.chip, { backgroundColor: ((NIVEL_OPTIONS.find((o) => o.id === cliente.nivel))?.color || colors?.border) + '30', flexDirection: 'row', alignItems: 'center', flexShrink: 0, marginTop: 0 }]}
                    onPress={() => onIdentificar(cliente)}
                  >
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: (NIVEL_OPTIONS.find((o) => o.id === cliente.nivel))?.color || colors?.border, marginRight: 6 }} />
                    <Text style={[s.chipText, { color: (NIVEL_OPTIONS.find((o) => o.id === cliente.nivel))?.color || colors?.text }]}>
                      {(NIVEL_OPTIONS.find((o) => o.id === cliente.nivel))?.label || cliente.nivel || 'Definir'}
                    </Text>
                    <Ionicons name="chevron-down" size={12} color={colors?.textSecondary} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ) : (cliente.nivel && (
                  <View style={[s.chip, { backgroundColor: ((NIVEL_OPTIONS.find((o) => o.id === cliente.nivel))?.color || colors?.primary) + '20', flexShrink: 0, marginTop: 0, flexDirection: 'row', alignItems: 'center' }]}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: (NIVEL_OPTIONS.find((o) => o.id === cliente.nivel))?.color || colors?.primary, marginRight: 6 }} />
                    <Text style={[s.chipText, { color: (NIVEL_OPTIONS.find((o) => o.id === cliente.nivel))?.color || colors?.primary }]}>
                      {(NIVEL_OPTIONS.find((o) => o.id === cliente.nivel))?.label || cliente.nivel}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <Section title="Contato" colors={colors}>
              {cliente.email ? <Row label="E-mail" value={cliente.email} colors={colors} /> : null}
              {cliente.phone ? <Row label="Telefone" value={cliente.phone} colors={colors} /> : null}
              {cliente.cpf ? <Row label="CPF" value={cliente.cpf} colors={colors} /> : null}
              {cliente.address ? <Row label="Endereço" value={cliente.address} colors={colors} /> : null}
            </Section>

            <Section title="Resumo" colors={colors}>
              <View style={s.statsRow}>
                <StatBox label="Agendamentos" value={events.length} colors={colors} />
                <StatBox label="Concluídos" value={concluidos.length} colors={colors} />
                <StatBox label="Faturados" value={faturados.length} colors={colors} />
              </View>
              <View style={s.statsRow}>
                <StatBox label="Cancelados" value={cancelados.length} colors={colors} />
                <StatBox label="Remarcados" value={remarcados.length} colors={colors} />
              </View>
              <View style={s.statsRow}>
                <StatBox label="Total recebido" value={formatCurrency(totalRecebido)} colors={colors} isText />
                <StatBox label="Média/agendamento" value={formatCurrency(valorMedio)} colors={colors} isText />
              </View>
            </Section>

            {events.length > 0 && (
              <Section title="Agendamentos" colors={colors}>
                {events
                  .sort((a, b) => {
                    const da = a.date || '';
                    const ta = a.time || '';
                    const db = b.date || '';
                    const tb = b.time || '';
                    return (db + tb).localeCompare(da + ta);
                  })
                  .map((e) => (
                    <View key={e.id} style={[s.eventRow, { borderColor: colors?.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.eventTitle, { color: colors?.text }]}>{e.title || 'Agendamento'}</Text>
                        <Text style={[s.eventMeta, { color: colors?.textSecondary }]}>
                          {e.date || '—'} {e.time ? `• ${e.time}` : ''}
                        </Text>
                        {getServiceName(e.serviceId) && (
                          <Text style={[s.eventService, { color: colors?.primary }]}>{getServiceName(e.serviceId)}</Text>
                        )}
                      </View>
                      <Text style={[s.eventAmount, { color: colors?.text }]}>{formatCurrency(e.amount || 0)}</Text>
                      <View style={[s.statusChip, { backgroundColor: e.status === 'concluido' ? '#10b98120' : '#f59e0b20' }]}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: e.status === 'concluido' ? '#10b981' : '#f59e0b' }}>
                          {e.status === 'concluido' ? 'Concluído' : 'Pendente'}
                        </Text>
                      </View>
                    </View>
                  ))}
              </Section>
            )}

            <View style={s.actions}>
              {onEdit && (
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors?.primaryRgba?.(0.2), borderColor: colors?.primary }]} onPress={onEdit}>
                  <Ionicons name="pencil" size={18} color={colors?.primary} />
                  <Text style={[s.actionText, { color: colors?.primary }]}>Editar</Text>
                </TouchableOpacity>
              )}
              {cliente.phone?.trim() && onConversar && (
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#25D36620', borderColor: '#25D366' }]} onPress={onConversar}>
                  <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                  <Text style={[s.actionText, { color: '#25D366' }]}>Conversar</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children, colors }) {
  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: colors?.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, colors }) {
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, { color: colors?.textSecondary }]}>{label}</Text>
      <Text style={[s.rowValue, { color: colors?.text }]}>{value}</Text>
    </View>
  );
}

function StatBox({ label, value, colors, isText }) {
  return (
    <View style={[s.statBox, { borderColor: colors?.border }]}>
      <Text style={[s.statValue, { color: colors?.primary }]} numberOfLines={1}>{value}</Text>
      <Text style={[s.statLabel, { color: colors?.textSecondary }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  box: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, maxHeight: '92%' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  title: { fontSize: 18, fontWeight: '700', flex: 1 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarInfo: { marginLeft: 16, flex: 1 },
  nome: { fontSize: 18, fontWeight: '700' },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 6 },
  chipText: { fontSize: 12, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', marginBottom: 12, letterSpacing: 0.5 },
  row: { marginBottom: 8 },
  rowLabel: { fontSize: 12 },
  rowValue: { fontSize: 15, fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statBox: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1 },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 4 },
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  eventTitle: { fontSize: 15, fontWeight: '600' },
  eventMeta: { fontSize: 12, marginTop: 2 },
  eventService: { fontSize: 12, marginTop: 2 },
  eventAmount: { fontSize: 14, fontWeight: '700', marginHorizontal: 12 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  actionText: { fontSize: 15, fontWeight: '600' },
});
