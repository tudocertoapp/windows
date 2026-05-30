import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { probeVisionOcr } from '../lib/visionStatus';

const STATUS_STYLE = {
  ok: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.45)', icon: 'checkmark-circle', color: '#16a34a' },
  warn: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.45)', icon: 'alert-circle', color: '#d97706' },
  error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', icon: 'close-circle', color: '#dc2626' },
};

export function VisionOcrStatusBadge({ colors, compact = false, onStatusChange }) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  const runProbe = useCallback(async () => {
    setLoading(true);
    const next = await probeVisionOcr();
    setResult(next);
    setLoading(false);
    onStatusChange?.(next);
  }, [onStatusChange]);

  useEffect(() => {
    runProbe();
  }, [runProbe]);

  if (loading) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: compact ? 4 : 8 }}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>Verificando OCR...</Text>
      </View>
    );
  }

  if (!result) return null;

  const palette = STATUS_STYLE[result.status] || STATUS_STYLE.error;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={runProbe}
      style={{
        flexDirection: 'row',
        alignItems: compact ? 'center' : 'flex-start',
        gap: 8,
        marginTop: compact ? 4 : 8,
        paddingHorizontal: compact ? 8 : 10,
        paddingVertical: compact ? 5 : 8,
        borderRadius: 10,
        borderWidth: 1,
        backgroundColor: palette.bg,
        borderColor: palette.border,
        alignSelf: 'flex-start',
        maxWidth: '100%',
      }}
    >
      <Ionicons name={palette.icon} size={compact ? 14 : 16} color={palette.color} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: compact ? 11 : 12, fontWeight: '700', color: palette.color }}>{result.label}</Text>
        {!compact && result.detail ? (
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 15 }}>{result.detail}</Text>
        ) : null}
      </View>
      <Ionicons name="refresh-outline" size={14} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}
