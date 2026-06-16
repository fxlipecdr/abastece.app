/**
 * useLocation — obtém a posição do usuário no mobile via expo-location.
 * Pede permissão e cai num fallback (União da Vitória, PR) se for negada.
 */
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

interface Coords {
  lat: number;
  lng: number;
}

interface LocationState {
  coords: Coords | null;
  loading: boolean;
  error: string | null;
}

const FALLBACK: Coords = { lat: -26.2306, lng: -51.0875 };

export function useLocation(): LocationState {
  const [state, setState] = useState<LocationState>({
    coords: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (active) setState({ coords: FALLBACK, loading: false, error: 'Permissão negada' });
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (active) {
          setState({
            coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (active) {
          setState({
            coords: FALLBACK,
            loading: false,
            error: err instanceof Error ? err.message : 'Erro de localização',
          });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return state;
}
