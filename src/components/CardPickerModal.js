import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { AVAILABLE_CARD_TYPES } from '../constants/dashboardCards';

function getCardById(id) {
  return AVAILABLE_CARD_TYPES.find((c) => c.id === id);
}

export function CardPickerModal({ visible, onClose, visibleIds, onAdd, onRemove }) {
  const { colors } = useTheme();
  const visibleCards = visibleIds.map((id) => getCardById(id)).filter(Boolean);
  const toAdd = AVAILABLE_CARD_TYPES.filter((c) => !visibleIds.includes(c.id));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[s.content, { backgroundColor: colors.card, borderColor: colors.border }]} onStartShouldSetResponder={() => true}>
          <View style={[s.header, { borderBottomColor: colors.border }]}>
            <Text style={[s.title, { color: colors.text }]}>Gerenciar cards</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={s.list} showsVerticalScrollIndicator>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Cards visíveis na página</Text>
            {visibleCards.length === 0 ? (
              <Text style={[s.empty, { color: colors.textSecondary }]}>Nenhum card na página. Adicione abaixo.</Text>
            ) : (
              visibleCards.map((card) => (
                <View key={card.id} style={[s.item, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <View style={[s.iconWrap, { backgroundColor: colors.primaryRgba(0.2) }]}>
                    <Ionicons name={card.icon} size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.itemLabel, { color: colors.text }]}>{card.label}</Text>
                    <Text style={[s.itemScreen, { color: colors.textSecondary }]}>{card.screen}</Text>
                  </View>
                  {onRemove && (
                    <TouchableOpacity onPress={() => onRemove(card.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}

            <Text style={[s.sectionTitle, { color: colors.text, marginTop: 20 }]}>Adicionar card</Text>
            {toAdd.length === 0 ? (
              <Text style={[s.empty, { color: colors.textSecondary }]}>Todos os cards já estão na página</Text>
            ) : (
              toAdd.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={[s.item, { backgroundColor: colors.bg, borderColor: colors.border }]}
                  onPress={() => onAdd(card.id)}
                  activeOpacity={0.7}
                >
                  <View style={[s.iconWrap, { backgroundColor: colors.primaryRgba(0.2) }]}>
                    <Ionicons name={card.icon} size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.itemLabel, { color: colors.text }]}>{card.label}</Text>
                    <Text style={[s.itemScreen, { color: colors.textSecondary }]}>{card.screen}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  list: { padding: 16, maxHeight: 480 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemLabel: { fontSize: 15, fontWeight: '600' },
  itemScreen: { fontSize: 12, marginTop: 2 },
  empty: { textAlign: 'center', paddingVertical: 32, fontSize: 14 },
});
