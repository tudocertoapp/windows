import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { FinanceProvider, useFinance } from './src/contexts/FinanceContext';
import { PlanProvider } from './src/contexts/PlanContext';
import { ProfileProvider } from './src/contexts/ProfileContext';
import { BanksProvider } from './src/contexts/BanksContext';
import { ReminderProvider } from './src/contexts/ReminderContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LandingScreen } from './src/screens/LandingScreen';
import { LoginScreen } from './src/screens/LoginScreen';

function AppWithReminders() {
  const { agendaEvents } = useFinance();
  return (
    <ReminderProvider agendaEvents={agendaEvents}>
      <AppNavigator />
    </ReminderProvider>
  );
}

function AppContent() {
  const { user, isGuest, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (loading) {
    return (
      <View style={[s.loading, { backgroundColor: '#111827' }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!user && !isGuest) {
    if (!showLogin) {
      return <LandingScreen onStart={() => setShowLogin(true)} />;
    }
    return <LoginScreen />;
  }

  return (
    <FinanceProvider>
      <BanksProvider>
        <PlanProvider>
          <ProfileProvider>
            <AppWithReminders />
          </ProfileProvider>
        </PlanProvider>
      </BanksProvider>
    </FinanceProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
