import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Screen, Text, Card, Button } from '@/components/ui';
import { useTheme } from '@/theme/useTheme';
import * as Location from 'expo-location';
import { useAuth } from '@/context/AuthContext';
import { getAccessToken } from '@/api/tokenStore';
import { API_BASE_URL } from '@/api/apiConfig';
import { MapPin, Wifi, WifiOff } from 'lucide-react-native';

export default function LiveTrackScreen() {
  const { colors, spacing } = useTheme();
  const { user } = useAuth();
  
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!user || !isTracking) {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (locationSubRef.current) { locationSubRef.current.remove(); locationSubRef.current = null; }
      setConnected(false);
      setConnecting(false);
      return;
    }

    let mounted = true;
    const token = getAccessToken();
    const wsUrl = `${API_BASE_URL.replace(/^http/, 'ws')}/ws/live-track`;

    const connect = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (mounted) setErrorMsg('Permission to access location was denied');
        return;
      }

      if (mounted) setConnecting(true);

      const wsWithToken = new WebSocket(`${wsUrl}?token=${token}`);
      wsRef.current = wsWithToken;

      wsWithToken.onopen = async () => {
        if (mounted) {
          setConnected(true);
          setConnecting(false);
          setErrorMsg(null);
        }

        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
          (loc) => {
            if (wsWithToken.readyState === WebSocket.OPEN) {
              const payload = {
                type: 'publish',
                agentId: user.id,
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
                accuracy: loc.coords.accuracy,
                heading: loc.coords.heading,
                speed: loc.coords.speed,
                agentName: `${user.firstName} ${user.lastName}`.trim(),
                batteryLevel: null,
                mockDetected: loc.mocked ?? false
              };
              wsWithToken.send(JSON.stringify(payload));
              if (mounted) setLastSent(new Date().toLocaleTimeString());
            }
          }
        );
        locationSubRef.current = sub;
      };

      wsWithToken.onerror = (e) => {
        console.error('WS Error:', e);
        if (mounted) {
          setErrorMsg('Failed to connect to tracking server.');
          setConnecting(false);
        }
      };

      wsWithToken.onclose = () => {
        if (mounted) {
          setConnected(false);
          setConnecting(false);
        }
      };
    };

    connect();

    return () => {
      mounted = false;
      if (locationSubRef.current) locationSubRef.current.remove();
      if (wsRef.current) wsRef.current.close();
    };
  }, [user, isTracking]);

  return (
    <Screen edges={['top']}>
      <View style={{ flex: 1, gap: spacing.s4, justifyContent: 'center', alignItems: 'center', padding: spacing.s5 }}>
        
        {errorMsg ? (
          <>
            <WifiOff size={48} color={colors.error} />
            <Text variant="title" style={{ textAlign: 'center', marginTop: spacing.s4 }}>Tracking Error</Text>
            <Text variant="body" color="error" style={{ textAlign: 'center' }}>
              {errorMsg}
            </Text>
          </>
        ) : !isTracking ? (
          <>
            <WifiOff size={48} color={colors.ink3} />
            <Text variant="title" style={{ textAlign: 'center', marginTop: spacing.s4 }}>Tracking Paused</Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
              You are currently not broadcasting your location.
            </Text>
          </>
        ) : connecting ? (
          <>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text variant="title" style={{ textAlign: 'center', marginTop: spacing.s4 }}>Connecting...</Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
              Establishing secure connection to live tracking server.
            </Text>
          </>
        ) : connected ? (
          <>
            <MapPin size={64} color={colors.success} style={{ marginBottom: spacing.s2 }} />
            <Text variant="title" style={{ textAlign: 'center' }}>Live Tracking Active</Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
              Your location is being broadcasted securely to supervisors.
            </Text>

            <Card style={{ marginTop: spacing.s6, width: '100%', alignItems: 'center', padding: spacing.s4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s2 }}>
                <Wifi size={20} color={colors.success} />
                <Text variant="bodyMedium" style={{ fontWeight: '700' }}>Server Connected</Text>
              </View>
              {lastSent ? (
                <Text variant="caption" color="secondary" style={{ marginTop: spacing.s2 }}>
                  Last location sent at: {lastSent}
                </Text>
              ) : (
                <Text variant="caption" color="secondary" style={{ marginTop: spacing.s2 }}>
                  Waiting for GPS lock...
                </Text>
              )}
            </Card>
          </>
        ) : (
          <>
            <WifiOff size={48} color={colors.ink3} />
            <Text variant="title" style={{ textAlign: 'center', marginTop: spacing.s4 }}>Disconnected</Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
              Connection to the live tracking server was lost.
            </Text>
          </>
        )}

        <View style={{ marginTop: spacing.s8, width: '100%' }}>
          <Button 
            label={isTracking ? "Stop Live Tracking" : "Start Live Tracking"} 
            onPress={() => setIsTracking(!isTracking)}
            style={{ backgroundColor: isTracking ? colors.error : colors.accent }}
          />
        </View>

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({});
