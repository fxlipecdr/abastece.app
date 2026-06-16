/**
 * StationMap — wrapper do Leaflet/OpenStreetMap com pins semafóricos.
 * -----------------------------------------------------------------------------
 * Cada posto recebe um marcador colorido pela categoria de preço. Usa divIcon
 * para desenhar o pin com a cor do design system (zero custo de API de mapas).
 */
import { useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { NearbyStation, PriceCategory } from '@abastece/types';
import { CATEGORY_COLORS, formatFuelPrice } from '@abastece/utils/price';

interface StationMapProps {
  center: { lat: number; lng: number };
  stations: NearbyStation[];
  onSelect?: (station: NearbyStation) => void;
}

/** Cria um pin SVG colorido pela categoria semafórica. */
function pinIcon(category: PriceCategory): L.DivIcon {
  const color = CATEGORY_COLORS[category];
  return L.divIcon({
    className: 'abastece-pin',
    html: `
      <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 24 16 24s16-13 16-24C32 7.2 24.8 0 16 0z"
              fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
        <circle cx="16" cy="15" r="6" fill="#FFFFFF"/>
      </svg>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -36],
  });
}

/** Recentraliza o mapa quando o centro muda (ex.: novo GPS). */
function Recenter({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
  return null;
}

export function StationMap({ center, stations, onSelect }: StationMapProps) {
  const markers = useMemo(
    () =>
      stations.map((s) => (
        <Marker
          key={s.id}
          position={[s.lat, s.lng]}
          icon={pinIcon(s.category ?? 'unknown')}
          eventHandlers={{ click: () => onSelect?.(s) }}
        >
          <Popup>
            <strong>{s.name}</strong>
            <br />
            <span className="price-value">{formatFuelPrice(s.price)}</span>
          </Popup>
        </Marker>
      )),
    [stations, onSelect],
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      zoomControl={false}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />
      {markers}
    </MapContainer>
  );
}
