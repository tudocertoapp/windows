/**
 * VoiceInput - fallback web: reconhecimento de voz disponível apenas no app mobile.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function VoiceInput() {
  return (
    <View style={s.container}>
      <View style={s.iconWrapper}>
        <Ionicons name="mic-off" size={48} color="#9ca3af" />
      </View>
      <Text style={s.text}>Reconhecimento de voz disponível no app mobile.</Text>
      <Text style={s.subtext}>Use o aplicativo Android ou iOS para cadastrar por voz.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
