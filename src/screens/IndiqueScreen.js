import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Share, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { TopBar } from '../components/TopBar';

const userId = 'TC-' + Math.random().toString(36).substring(2, 10).toUpperCase();
const linkIndicacao = `https://tudocerto.app/indique/${userId}`;

const is = StyleSheet.create({
  card: { marginHorizontal: 16, padding: 24, borderRadius: 20, borderWidth: 1, marginBottom: 16 },
  idBox: { padding: 16, borderRadius: 12, marginBottom: 16 },
  idLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
  idValue: { fontSize: 18, fontWeight: '700' },
  linkBox: { padding: 14, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  beneficios: { marginTop: 24 },
  beneficio: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
});

export function IndiqueScreen({ onClose, isModal }) {
  const { colors } = useTheme();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Baixe o app Tudo Certo e organize sua vida! Use meu link: ${linkIndicacao}`,
        title: 'Tudo Certo - Indique um amigo',
      });
    } catch (_) {}
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {isModal && onClose ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, backgroundColor: colors.card, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Indique um Amigo</Text>
          <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TopBar title="Indique um Amigo" colors={colors} />
      )}
      <ScrollView showsVerticalScrollIndicator={false} style={{ paddingTop: 24 }}>
        <View style={[is.card, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8 }}>Ganhe benefícios!</Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>Cada amigo que baixar o app usando seu link vale pontos para descontos e recursos premium.</Text>
        </View>
        <View style={[is.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 12 }}>SEU ID ÚNICO</Text>
          <View style={[is.idBox, { backgroundColor: colors.primaryRgba(0.15), borderWidth: 0 }]}>
            <Text style={[is.idLabel, { color: colors.textSecondary }]}>ID de indicação</Text>
            <Text style={[is.idValue, { color: colors.primary }]}>{userId}</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>LINK DE INDICAÇÃO</Text>
          <View style={[is.linkBox, { borderColor: colors.border, backgroundColor: colors.bg }]}>
            <Ionicons name="link" size={20} color={colors.primary} />
            <Text style={{ flex: 1, fontSize: 12, color: colors.text }} numberOfLines={2}>{linkIndicacao}</Text>
          </View>
          <TouchableOpacity style={[is.btn, { backgroundColor: colors.primary, marginTop: 16 }]} onPress={handleShare}>
            <Ionicons name="share-social" size={22} color="#fff" />
            <Text style={is.btnText}>Compartilhar link</Text>
          </TouchableOpacity>
        </View>
        <View style={[is.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 }}>Como funciona</Text>
          {[
            { icon: 'person-add', text: 'Compartilhe seu link único com amigos' },
            { icon: 'download', text: 'Eles baixam o app Tudo Certo' },
            { icon: 'gift', text: 'Vocês ganham benefícios exclusivos' },
          ].map((b, i) => (
            <View key={i} style={is.beneficio}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryRgba(0.2), justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name={b.icon} size={20} color={colors.primary} />
              </View>
              <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>{b.text}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
