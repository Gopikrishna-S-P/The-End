import { useState } from 'react';
import * as Location from 'expo-location';

export interface GpsFix {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  address?: string;
  mockLocationDetected?: boolean;
}

export function useGpsCapture() {
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = async () => {
    setCapturing(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to log a visit.');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const mocked = (pos as { mocked?: boolean }).mocked ?? false;

      let address: string | undefined;
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        const r = results[0];
        if (r) address = [r.name, r.street, r.city, r.region].filter(Boolean).join(', ');
      } catch {
        // Reverse geocoding is best-effort — a missing address doesn't block the visit.
      }

      setFix({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? undefined,
        altitude: pos.coords.altitude ?? undefined,
        address,
        mockLocationDetected: mocked,
      });
    } catch {
      setError('Could not get your location. Check that GPS is enabled and try again.');
    } finally {
      setCapturing(false);
    }
  };

  return { fix, capturing, error, capture };
}
