// ═══════════════════════════════════════════════════════
// DashboardScreen — Pantalla principal con mapa y datos
// ═══════════════════════════════════════════════════════

import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { colors, spacing, radius, fuelColor } from '../lib/theme';
import { useFleetStore } from '../lib/store';
import { useWebSocket } from '../hooks/useWebSocket';
import { registerForPushNotifications } from '../lib/notifications';
import { onConnectionChange } from '../lib/offline';
import VehicleCard from '../components/VehicleCard';
import FuelChart from '../components/FuelChart';
import AlertsList from '../components/AlertsList';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DashboardScreenProps {
  onLogout: () => void;
}

export default function DashboardScreen({ onLogout }: DashboardScreenProps) {
  const {
    user,
    positions,
    selectedVehicleId,
    history,
    alerts,
    online,
    loading,
    loadVehicles,
    selectVehicle,
    loadAlerts,
    setOnline,
  } = useFleetStore();

  const { connected: wsConnected } = useWebSocket();
  const isAdminUser = user?.role === 'admin';

  useEffect(() => {
    registerForPushNotifications();
    const cleanup = onConnectionChange((isOn) => {
      setOnline(isOn);
      if (isOn) loadVehicles();
    });
    return cleanup;
  }, []);

  const selectedVehicle = positions.find((p) => p.vehicle.id === selectedVehicleId);
  const mapRegion = positions.length > 0
    ? {
        latitude: positions[0].reading.latitude,
        longitude: positions[0].reading.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }
    : {
        latitude: 7.8939,
        longitude: -72.5078,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };

  const handleLogout = async () => {
    await useFleetStore.getState().logout();
    onLogout();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Fleet Monitor</Text>
          {isAdminUser && <View style={styles.adminBadge}><Text style={styles.adminText}>ADMIN</Text></View>}
        </View>
        <View style={styles.headerRight}>
          {!online && <View style={styles.offlineBadge}><Text style={styles.offlineText}>OFFLINE</Text></View>}
          <View style={[styles.wsDot, { backgroundColor: wsConnected ? colors.status.success : colors.status.danger }]} />
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadVehicles}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Mapa */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UBICACIÓN EN VIVO</Text>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={mapRegion}
              customMapStyle={darkMapStyle}
            >
              {positions.map(({ vehicle, reading }) => (
                <Marker
                  key={vehicle.id}
                  coordinate={{
                    latitude: reading.latitude,
                    longitude: reading.longitude,
                  }}
                  pinColor={fuelColor(reading.fuel_level)}
                  onPress={() => selectVehicle(vehicle.id)}
                >
                  <Callout>
                    <View style={styles.callout}>
                      <Text style={styles.calloutTitle}>{vehicle.name}</Text>
                      <Text style={styles.calloutText}>
                        {reading.speed.toFixed(0)} km/h · {reading.fuel_level.toFixed(0)}% fuel · {reading.temperature.toFixed(0)}°C
                      </Text>
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>
            {/* Live indicator */}
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{positions.length} vehículos</Text>
            </View>
          </View>
        </View>

        {/* Tarjetas de vehículos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FLOTA</Text>
          {positions.map(({ vehicle, reading }) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              reading={reading}
              selected={selectedVehicleId === vehicle.id}
              onPress={() => selectVehicle(
                selectedVehicleId === vehicle.id ? null : vehicle.id
              )}
            />
          ))}
        </View>

        {/* Gráfico de historial (si hay vehículo seleccionado) */}
        {selectedVehicle && history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              HISTORIAL — {selectedVehicle.vehicle.name}
            </Text>
            <FuelChart readings={history} />
          </View>
        )}

        {/* Alertas (solo admin) */}
        {isAdminUser && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ALERTAS</Text>
              {alerts.length > 0 && (
                <View style={styles.alertCount}>
                  <Text style={styles.alertCountText}>{alerts.length}</Text>
                </View>
              )}
            </View>
            <AlertsList alerts={alerts} onRefresh={loadAlerts} />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// Estilo oscuro para Google Maps
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a2332' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0e1a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#243044' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1525' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 52,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.bg.primary,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  adminBadge: {
    backgroundColor: 'rgba(168,85,247,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminText: { fontSize: 9, fontWeight: '700', color: '#c084fc', letterSpacing: 0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  offlineBadge: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  offlineText: { fontSize: 9, fontWeight: '700', color: '#fcd34d', letterSpacing: 0.5 },
  wsDot: { width: 8, height: 8, borderRadius: 4 },
  logoutBtn: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  logoutText: { fontSize: 12, color: colors.text.muted },
  scroll: { flex: 1 },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  mapContainer: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  map: { width: '100%', height: 280 },
  liveIndicator: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,14,26,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.status.success,
  },
  liveText: { fontSize: 11, color: colors.text.secondary },
  callout: { padding: 4, minWidth: 140 },
  calloutTitle: { fontWeight: '600', fontSize: 13 },
  calloutText: { fontSize: 11, color: '#666', marginTop: 2 },
  alertCount: {
    backgroundColor: colors.status.danger,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  alertCountText: { fontSize: 10, fontWeight: '700', color: '#fff' },
});
