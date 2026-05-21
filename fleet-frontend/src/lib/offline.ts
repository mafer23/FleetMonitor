import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Vehicle, SensorReading, Alert } from './api';
interface FleetDB extends DBSchema {
  vehicles: {
    key: number;
    value: Vehicle;
  };
  readings: {
    key: number;
    value: SensorReading;
    indexes: { 'by-vehicle': number };
  };
  alerts: {
    key: number;
    value: Alert;
  };
  meta: {
    key: string;
    value: { key: string; timestamp: number; data: unknown };
  };
}

const DB_NAME = 'fleet-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<FleetDB>> | null = null;

function getDB(): Promise<IDBPDatabase<FleetDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FleetDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store de vehículos
        if (!db.objectStoreNames.contains('vehicles')) {
          db.createObjectStore('vehicles', { keyPath: 'id' });
        }
        // Store de lecturas con índice por vehículo
        if (!db.objectStoreNames.contains('readings')) {
          const store = db.createObjectStore('readings', { keyPath: 'id' });
          store.createIndex('by-vehicle', 'vehicle_id');
        }
        // Store de alertas
        if (!db.objectStoreNames.contains('alerts')) {
          db.createObjectStore('alerts', { keyPath: 'id' });
        }
        // Store de metadata (timestamps de última sincronización)
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function cacheVehicles(vehicles: Vehicle[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('vehicles', 'readwrite');
  await Promise.all([
    ...vehicles.map((v) => tx.store.put(v)),
    tx.done,
  ]);
  await setMeta('vehicles_cached_at', Date.now());
}

export async function getCachedVehicles(): Promise<Vehicle[]> {
  const db = await getDB();
  return db.getAll('vehicles');
}

export async function cacheReadings(readings: SensorReading[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('readings', 'readwrite');
  await Promise.all([
    ...readings.map((r) => tx.store.put(r)),
    tx.done,
  ]);
}

export async function getCachedReadings(vehicleId: number): Promise<SensorReading[]> {
  const db = await getDB();
  return db.getAllFromIndex('readings', 'by-vehicle', vehicleId);
}

export async function cacheAlerts(alerts: Alert[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('alerts', 'readwrite');
  await Promise.all([
    ...alerts.map((a) => tx.store.put(a)),
    tx.done,
  ]);
}

export async function getCachedAlerts(): Promise<Alert[]> {
  const db = await getDB();
  return db.getAll('alerts');
}

async function setMeta(key: string, data: unknown): Promise<void> {
  const db = await getDB();
  await db.put('meta', { key, timestamp: Date.now(), data });
}

export async function getMetaTimestamp(key: string): Promise<number | null> {
  const db = await getDB();
  const meta = await db.get('meta', key);
  return meta?.timestamp ?? null;
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function onConnectionChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
