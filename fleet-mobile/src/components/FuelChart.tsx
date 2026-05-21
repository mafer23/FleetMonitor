
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SensorReading } from '../lib/api';
import { colors, spacing, radius } from '../lib/theme';

const CHART_WIDTH = Dimensions.get('window').width - 32;

interface FuelChartProps {
  readings: SensorReading[];
}

export default function FuelChart({ readings }: FuelChartProps) {
  if (readings.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Se necesitan al menos 2 lecturas para el gráfico</Text>
      </View>
    );
  }

  // Tomar las últimas 15 lecturas, invertidas (cronológicas)
  const data = [...readings].reverse().slice(-15);

  const fuelData = data.map((r) => r.fuel_level);
  const speedData = data.map((r) => r.speed);
  const labels = data.map((r) =>
    new Date(r.recorded_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  );

  // Mostrar solo cada 3 labels para no amontonar
  const sparseLabels = labels.map((l, i) => (i % 3 === 0 ? l : ''));

  return (
    <View style={styles.container}>
      {/* Combustible */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Combustible</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>%</Text>
          </View>
        </View>
        <LineChart
          data={{
            labels: sparseLabels,
            datasets: [{ data: fuelData, color: () => colors.status.warning, strokeWidth: 2 }],
          }}
          width={CHART_WIDTH - 32}
          height={160}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: colors.bg.card,
            backgroundGradientTo: colors.bg.card,
            decimalPlaces: 0,
            color: () => 'rgba(245,158,11,0.3)',
            labelColor: () => colors.text.muted,
            propsForDots: { r: '0' },
            propsForBackgroundLines: { stroke: 'rgba(255,255,255,0.04)' },
          }}
          bezier
          withInnerLines
          withOuterLines={false}
          style={styles.chart}
        />
      </View>

      {/* Velocidad */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Velocidad</Text>
          <View style={[styles.badge, { backgroundColor: 'rgba(34,211,238,0.1)' }]}>
            <Text style={[styles.badgeText, { color: colors.accent }]}>km/h</Text>
          </View>
        </View>
        <LineChart
          data={{
            labels: sparseLabels,
            datasets: [{ data: speedData, color: () => colors.accent, strokeWidth: 2 }],
          }}
          width={CHART_WIDTH - 32}
          height={160}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: colors.bg.card,
            backgroundGradientTo: colors.bg.card,
            decimalPlaces: 0,
            color: () => 'rgba(34,211,238,0.3)',
            labelColor: () => colors.text.muted,
            propsForDots: { r: '0' },
            propsForBackgroundLines: { stroke: 'rgba(255,255,255,0.04)' },
          }}
          bezier
          withInnerLines
          withOuterLines={false}
          style={styles.chart}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  chartCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  chartTitle: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  badge: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { fontFamily: 'monospace', fontSize: 10, color: colors.status.warning },
  chart: { marginLeft: -16, borderRadius: radius.md },
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
