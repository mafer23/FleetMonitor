
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Alert as AlertType, resolveAlert } from '../lib/api';
import { colors, spacing, radius } from '../lib/theme';

interface AlertsListProps {
  alerts: AlertType[];
  onRefresh: () => void;
}

const iconMap: Record<string, string> = {
  low_fuel: '⛽',
  high_temp: '🌡️',
  speeding: '💨',
};

export default function AlertsList({ alerts, onRefresh }: AlertsListProps) {
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const handleResolve = async (id: number) => {
    setResolvingId(id);
    try {
      await resolveAlert(id);
      onRefresh();
    } catch (err) {
      console.error('Error resolviendo alerta:', err);
    } finally {
      setResolvingId(null);
    }
  };

  if (alerts.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Sin alertas activas</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {alerts.map((alert) => (
        <View key={alert.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.icon}>{iconMap[alert.type] || '⚠️'}</Text>
            <View style={styles.content}>
              <View style={styles.badgeRow}>
                <View style={[
                  styles.badge,
                  alert.severity === 'critical' ? styles.badgeCritical : styles.badgeWarning,
                ]}>
                  <Text style={[
                    styles.badgeText,
                    alert.severity === 'critical' ? styles.badgeCriticalText : styles.badgeWarningText,
                  ]}>
                    {alert.severity}
                  </Text>
                </View>
                <Text style={styles.time}>
                  {new Date(alert.created_at).toLocaleString('es', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: 'short',
                  })}
                </Text>
              </View>
              <Text style={styles.message}>{alert.message}</Text>
            </View>

            <TouchableOpacity
              onPress={() => handleResolve(alert.id)}
              disabled={resolvingId === alert.id}
              style={styles.resolveBtn}
              activeOpacity={0.7}
            >
              {resolvingId === alert.id ? (
                <ActivityIndicator size="small" color={colors.status.success} />
              ) : (
                <Text style={styles.resolveText}>✓</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: { fontSize: 20, marginTop: 2 },
  content: { flex: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgeCritical: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  badgeWarning: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.3)',
  },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeCriticalText: { color: '#fca5a5' },
  badgeWarningText: { color: '#fcd34d' },
  time: { fontSize: 11, color: colors.text.muted },
  message: { fontSize: 13, color: colors.text.secondary, lineHeight: 18 },
  resolveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resolveText: { fontSize: 16, color: colors.status.success },
  empty: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyText: { fontSize: 13, color: colors.text.muted },
});
