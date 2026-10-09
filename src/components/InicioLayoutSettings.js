import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useProfile } from '../contexts/ProfileContext';
import { playTapSound } from '../utils/sounds';
import {
  INICIO_READY_LAYOUTS,
  getInicioLayoutStorageKeys,
  commitInicioLayoutToAccount,
} from '../constants/inicioLayouts';

export function InicioLayoutSettings() {
  const { colors } = useTheme();
  const { profile, updateProfile } = useProfile();
  const keys = useMemo(() => getInicioLayoutStorageKeys(), []);
  const [hasFavorite, setHasFavorite] = useState(!!profile?.inicio_layout_favorite);

  useEffect(() => {
    AsyncStorage.getItem(keys.favorite).then((raw) => {
      if (raw || profile?.inicio_layout_favorite) setHasFavorite(true);
    }).catch(() => {});
  }, [keys.favorite, profile?.inicio_layout_favorite]);

  const applyReady = async (lay) => {
    playTapSound();
    const layout = lay?.layout;
    if (!layout) return;
    await commitInicioLayoutToAccount(layout, { updateProfile });
    Alert.alert('Layout do Início', `${lay.name} aplicado e salvo na sua conta.`);
  };

  const applyFavorite = async () => {
    playTapSound();
    let layout = profile?.inicio_layout_favorite;
    try {
      const raw = await AsyncStorage.getItem(keys.favorite);
      if (raw) layout = JSON.parse(raw);
    } catch (_) {}
    if (!layout) {
      Alert.alert('Favorito', 'Nenhum layout favorito salvo ainda.');
      return;
    }
    await commitInicioLayoutToAccount(layout, { updateProfile });
    Alert.alert('Layout do Início', 'Favorito aplicado e salvo.');
  };

  return (
    <View>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Layout do Início</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
          Cinco modelos prontos. Toque para aplicar e gravar na sua conta. No Início, edite os cards e salve; se sair sem salvar, volta ao último gravado.
        </Text>
      </View>
      {INICIO_READY_LAYOUTS.map((lay) => (
        <TouchableOpacity
          key={lay.id}
          onPress={() => applyReady(lay)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Ionicons name="albums-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{lay.name}</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{lay.desc}</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Aplicar</Text>
        </TouchableOpacity>
      ))}
      {hasFavorite ? (
        <TouchableOpacity
          onPress={applyFavorite}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Ionicons name="star" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Meu favorito</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Aplica o layout que você marcou como favorito no Início.</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            No Início, organize os cards e use “Salvar como favorito” para aparecer aqui.
          </Text>
        </View>
      )}
    </View>
  );
}
