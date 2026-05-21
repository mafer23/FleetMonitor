'use client';
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Vehicle, SensorReading } from '@/lib/api';

interface VehiclePosition {
  vehicle: Vehicle;
  reading: SensorReading;
}

interface FleetMapProps {
  positions: VehiclePosition[];
}

export default function FleetMap({ positions }: FleetMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap',
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [-72.5078, 7.8939], // Cúcuta, Colombia como default
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Actualizar marcadores cuando cambian las posiciones
  useEffect(() => {
    if (!mapRef.current) return;

    // Limpiar marcadores anteriores
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (positions.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();

    positions.forEach(({ vehicle, reading }) => {
      const fuelColor =
        reading.fuel_level < 15
          ? '#ef4444'
          : reading.fuel_level < 40
            ? '#f59e0b'
            : '#10b981';

      // Marcador custom con HTML
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="
          width: 36px; height: 36px;
          background: ${fuelColor};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
            <path d="M9 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM19 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"/>
            <path d="M13 6h5l3 5v6h-2M5 17H3v-6l3-5h4M5 9h4m0-3v9" stroke="white" fill="none" stroke-width="1.5"/>
          </svg>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 20 }).setHTML(`
        <div style="min-width: 180px;">
          <div style="font-weight: 600; margin-bottom: 6px; font-size: 14px;">${vehicle.name}</div>
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #94a3b8; margin-bottom: 8px;">
            ${vehicle.device_id}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px;">
            <span style="color: #94a3b8;">Velocidad</span>
            <span style="text-align: right;">${reading.speed.toFixed(0)} km/h</span>
            <span style="color: #94a3b8;">Combustible</span>
            <span style="text-align: right; color: ${fuelColor};">${reading.fuel_level.toFixed(0)}%</span>
            <span style="color: #94a3b8;">Temperatura</span>
            <span style="text-align: right;">${reading.temperature.toFixed(0)}°C</span>
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([reading.longitude, reading.latitude])
        .setPopup(popup)
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
      bounds.extend([reading.longitude, reading.latitude]);
    });

    // Ajustar vista para mostrar todos los marcadores
    if (positions.length > 1) {
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    } else {
      mapRef.current.flyTo({
        center: [positions[0].reading.longitude, positions[0].reading.latitude],
        zoom: 14,
      });
    }
  }, [positions]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.06]">
      <div ref={mapContainer} style={{ width: '100%', height: '420px' }} />
      {/* Overlay con status */}
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-lg bg-fleet-900/80 px-3 py-1.5 backdrop-blur-sm">
        <div className="status-live" />
        <span className="text-xs font-medium text-slate-300">
          {positions.length} vehículo{positions.length !== 1 ? 's' : ''} en vivo
        </span>
      </div>
    </div>
  );
}
