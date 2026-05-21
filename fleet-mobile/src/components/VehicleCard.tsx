// ═══════════════════════════════════════════════════════
// VehicleCard — Tarjeta resumen de un vehículo
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Vehicle, SensorReading } from '../lib/api';
import { colors, spacing, radius, fuelColor } from '../lib/theme';

interface VehicleCardProps {
  vehicle: Vehicle;
  reading: SensorReading;
  selected: boolean;
  onPress: () => void;
}

export default function VehicleCard({ vehicle, reading, selected, onPress }: VehicleCardProps) {
  const autonomy =
    reading.consumption > 0
      ? (reading.fuel_capacity * (reading.fuel_level / 100)) / reading.consumption
      : 999;
  const isLow = autonomy < 1;
  const fColor = fuelColor(reading.fuel_level);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.card,
        selected && styles.cardSelected,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={styles.name}>{vehicle.name}</Text>
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveLabel}>EN LÍNEA</Text>
        </View>
      </View>

      <Text style={styles.deviceId}>{vehicle.device_id}</Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>VEL</Text>
          <Text style={[styles.statValue, { color: colors.accent }]}>
            {reading.speed.toFixed(0)}
          </Text>
          <Text style={styles.statUnit}>km/h</Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statLabel}>FUEL</Text>
          <Text style={[styles.statValue, { color: fColor }]}>
            {reading.fuel_level.toFixed(0)}%
          </Text>
          <Text style={styles.statUnit}>nivel</Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statLabel}>TEMP</Text>
          <Text style={[styles.statValue, { color: reading.temperature > 90 ? colors.status.danger : colors.text.primary }]}>
            {reading.temperature.toFixed(0)}°
          </Text>
          <Text style={styles.statUnit}>°C</Text>
        </View>
      </View>

      {/* Fuel warning */}
      {isLow && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            ⚠️ Autonomía: {autonomy.toFixed(1)}h — Combustible bajo
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardSelected: {
    borderColor: 'rgba(34,211,238,0.3)',
    backgroundColor: 'rgba(34,211,238,0.04)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.status.success },
  liveLabel: { fontSize: 9, fontWeight: '600', color: colors.text.muted, letterSpacing: 0.5 },
  deviceId: { fontFamily: 'monospace', fontSize: 11, color: colors.text.muted, marginBottom: spacing.md },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    backgroundColor: 'rgba(10,14,26,0.6)',
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  statLabel: { fontSize: 9, fontWeight: '600', color: colors.text.muted, letterSpacing: 0.5 },
  statValue: { fontFamily: 'monospace', fontSize: 16, fontWeight: '600', marginVertical: 2 },
  statUnit: { fontSize: 9, color: colors.text.muted },
  warning: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    padding: spacing.sm,
  },
  warningText: { fontSize: 12, color: '#fca5a5' },
});
