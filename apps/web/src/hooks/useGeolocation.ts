/**
 * useGeolocation — obtém a posição do usuário com fallback gracioso.
 * Se a permissão for negada, retorna erro para a UI sugerir busca por cidade/CEP.
 */
import { useEffect, useState } from 'react';

interface GeoState {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
}

/** Fallback: centro aproximado de União da Vitória, PR. */
const FALLBACK = { lat: -26.2306, lng: -51.0875 };

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lng: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState({ ...FALLBACK, loading: false, error: 'Geolocalização indisponível' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          loading: false,
          error: null,
        }),
      (err) =>
        // Permissão negada ou timeout: cai no fallback mas reporta o erro.
        setState({ ...FALLBACK, loading: false, error: err.message }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  return state;
}
