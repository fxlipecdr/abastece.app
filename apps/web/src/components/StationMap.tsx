/**
 * StationMap — wrapper do Leaflet/OpenStreetMap com pins de preço semafóricos.
 * -----------------------------------------------------------------------------
 * Cada posto vira um "balão" com o preço escrito e cor pela categoria. Quem não
 * tem preço vira um pin pequeno e neutro. Zero custo de API de mapas (OSM).
 */
import { useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { NearbyStation, PriceCategory } from '@abastece/types';
import { formatFuelPrice } from '@abastece/utils/price';

interface StationMapProps {
  center: { lat: number; lng: number };
  stations: NearbyStation[];
  onSelect?: (station: NearbyStation) => void;
}

const GRADIENTS: Record<PriceCategory, [string, string]> = {
  cheap: ['#22C55E', '#0B7A3B'],
  mid: ['#FFD60A', '#FF8F00'],
  expensive: ['#F43F5E', '#E11D48'],
  unknown: ['#B9CCC0', '#8AA694'],
};

/** Pin com rótulo de preço (ou ponto neutro quando sem preço). */
function priceIcon(station: NearbyStation): L.DivIcon {
  const category = station.category ?? 'unknown';
  const [c1, c2] = GRADIENTS[category];
  const hasPrice = station.price !== null;
  const label = hasPrice ? formatFuelPrice(station.price).replace('R$ ', '') : '?';
  const textColor = category === 'mid' ? '#5A3A00' : '#FFFFFF';

  const width = hasPrice ? 64 : 30;
  return L.divIcon({
    className: 'abastece-pin',
    html: `
      <div style="
        position:relative;display:flex;align-items:center;justify-content:center;
        min-width:${width}px;height:30px;padding:0 8px;
        background:linear-gradient(135deg,${c1},${c2});
        color:${textColor};font-family:'JetBrains Mono',monospace;font-weight:800;
        font-size:13px;border-radius:999px;border:2.5px solid #fff;
        box-shadow:0 4px 12px rgba(6,78,43,.35);white-space:nowrap;">
        ${label}
        <span style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);
          width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;
          border-top:8px solid ${c2};"></span>
      </div>`,
    iconSize: [width, 38],
    iconAnchor: [width / 2, 38],
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
          icon={priceIcon(s)}
          eventHandlers={{ click: () => onSelect?.(s) }}
          zIndexOffset={s.price !== null ? 100 : 0}
        />
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
