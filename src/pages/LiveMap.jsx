import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { useSupabase } from '../hooks/useSupabase';
import { useRealtime } from '../hooks/useRealtime';
import { VEHICLE_CATEGORIES, DELIVERY_STATUSES } from '../utils/constants';
import { formatCurrency } from '../utils/formatCurrency';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createMotoboyIcon(isOnline) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 32px; height: 32px; border-radius: 50%;
        background: ${isOnline ? '#99EB09' : '#666'};
        border: 3px solid ${isOnline ? '#003D1A' : '#333'};
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${isOnline ? '#003D1A' : '#aaa'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/>
          <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-3 11.5V14l-3-3 4-3 2 3h2"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function LiveMap() {
  const { data: Motoboy, refetch: refetchMotoboy } = useSupabase('Motoboy', {
    select: '*, users!Motoboy_id_fkey(name, phone)',
  });

  const { data: activeDeliveries, refetch: refetchDeliveries } = useSupabase('deliveries', {
    select: '*',
    filters: [
      {
        column: 'status',
        operator: 'in',
        value: ['pending', 'accepted', 'in_progress'],
      },
    ],
  });

  useRealtime('Motoboy', {
    onUpdate: () => refetchMotoboy(),
  });

  useRealtime('deliveries', {
    onInsert: () => refetchDeliveries(),
    onUpdate: () => refetchDeliveries(),
  });

  const motoboyList = (Motoboy || []).filter(
    m => m.current_lat && m.current_lng
  );
  const onlineCount = (Motoboy || []).filter(m => m.is_online).length;

  // Default center: Goiânia, GO
  const center = [-16.6869, -49.2648];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mapa ao Vivo</h1>
          <p className="page-subtitle">
            {onlineCount} motoboy{onlineCount !== 1 ? 's' : ''} online ·{' '}
            {(activeDeliveries || []).length} entrega{(activeDeliveries || []).length !== 1 ? 's' : ''} ativa{(activeDeliveries || []).length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div
        style={{
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--surface-border)',
          height: 'calc(100vh - 200px)',
        }}
      >
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Motoboy */}
          {motoboyList.map(m => (
            <Marker
              key={m.id}
              position={[m.current_lat, m.current_lng]}
              icon={createMotoboyIcon(m.is_online)}
            >
              <Popup>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>
                  <strong>{m.users?.name || 'Motoboy'}</strong>
                  <br />
                  <span style={{ color: '#aaa' }}>
                    {VEHICLE_CATEGORIES[m.vehicle_category] || m.vehicle_category}
                  </span>
                  <br />
                  <span style={{ color: m.is_online ? '#99EB09' : '#666' }}>
                    {m.is_online ? '● Online' : '○ Offline'}
                  </span>
                  <br />
                  <span>Saldo: {formatCurrency(m.wallet_balance)}</span>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Active deliveries - pickup points */}
          {(activeDeliveries || []).map(d => (
            <CircleMarker
              key={`pickup-${d.id}`}
              center={[d.pickup_lat, d.pickup_lng]}
              radius={6}
              pathOptions={{
                color: DELIVERY_STATUSES[d.status]?.color || '#FFB800',
                fillColor: DELIVERY_STATUSES[d.status]?.color || '#FFB800',
                fillOpacity: 0.6,
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12 }}>
                  <strong>Coleta</strong>
                  <br />{d.pickup_address}
                  <br /><span style={{ color: '#99EB09' }}>{formatCurrency(d.value)}</span>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Active deliveries - delivery points */}
          {(activeDeliveries || []).map(d => (
            <CircleMarker
              key={`delivery-${d.id}`}
              center={[d.delivery_lat, d.delivery_lng]}
              radius={6}
              pathOptions={{
                color: '#FF3B3B',
                fillColor: '#FF3B3B',
                fillOpacity: 0.6,
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12 }}>
                  <strong>Entrega</strong>
                  <br />{d.delivery_address}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
