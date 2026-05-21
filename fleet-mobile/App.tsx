// ═══════════════════════════════════════════════════════
// App.tsx — Punto de entrada de la aplicación
// Maneja navegación entre Login y Dashboard
// ═══════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { useFleetStore } from './src/lib/store';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import { colors } from './src/lib/theme';

export default function App() {
  const { isAuthenticated, loading, initialize } = useFleetStore();
  const [screen, setScreen] = useState<'loading' | 'login' | 'dashboard'>('loading');

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (loading) {
      setScreen('loading');
    } else if (isAuthenticated) {
      setScreen('dashboard');
    } else {
      setScreen('login');
    }
  }, [loading, isAuthenticated]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.primary} />

      {screen === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      )}

      {screen === 'login' && (
        <LoginScreen onLoginSuccess={() => setScreen('dashboard')} />
      )}

      {screen === 'dashboard' && (
        <DashboardScreen onLogout={() => setScreen('login')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
