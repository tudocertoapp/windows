import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import { playTapSound } from '../utils/sounds';

/**
 * Aviso global quando a assinatura Stripe está com pagamento pendente.
 */
export function SubscriptionPastDueBanner({ onRegularize }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { subscriptionPastDue, subscribedPlanLabel, hasPaidPlanAccess } = usePlan();

  if (!user?.id || !subscriptionPastDue || hasPaidPlanAccess) return null;

  return (
    <View
      style={{
        marginHorizontal: Platform.OS === 'web' ? 12 : 10,
        marginTop: Platform.OS === 'web' ? 8 : 6,
        marginBottom: 4,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#f59e0b',
        backgroundColor: colors.bg === '#fff' || colors.bg === '#ffffff' ? '#fffbeb' : 'rgba(245,158,11,0.12)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Ionicons name="warning-outline" size={22} color="#d97706" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 2 }}>
          Pagamento em atraso
        </Text>
        <Text style={{ fontSize: 12, lineHeight: 17, color: colors.textSecondary }}>
          {`Regularize a assinatura${subscribedPlanLabel ? ` (${subscribedPlanLabel})` : ''} para voltar a usar os recursos pagos. Enquanto não regularizar, o app funciona apenas com o plano gratuito.`}
        </Text>
      </View>
      {onRegularize ? (
        <TouchableOpacity
          onPress={() => {
            playTapSound();
            onRegularize();
          }}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: '#d97706',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>Regularizar</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
