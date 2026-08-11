import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/context/AuthContext';
import { Text, Button } from '@/components/ui';

interface SecurityContextProps {
  isLocked: boolean;
  unlockApp: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextProps | undefined>(undefined);

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [showPrivacyScreen, setShowPrivacyScreen] = useState(false);
  const appState = useRef(AppState.currentState);

  const authenticate = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // Fallback or bypass lock if no biometrics setup (since app security policy depends on availability)
        setIsLocked(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock RecoverPro',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsLocked(false);
      } else {
        setIsLocked(true);
      }
    } catch (e) {
      console.error('Biometric authentication failed:', e);
      setIsLocked(true);
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      // Blur the screen as soon as it goes to background/inactive
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        setShowPrivacyScreen(true);
      }

      // App comes back to foreground
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        setShowPrivacyScreen(false);
        if (user) {
          setIsLocked(true);
          await authenticate();
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  const unlockApp = async () => {
    await authenticate();
  };

  return (
    <SecurityContext.Provider value={{ isLocked, unlockApp }}>
      {children}
      {showPrivacyScreen && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <BlurView intensity={50} style={StyleSheet.absoluteFill} tint="dark" />
        </View>
      )}
      {user && isLocked && (
        <View style={[StyleSheet.absoluteFill, styles.lockContainer]}>
          <Text style={styles.lockTitle}>App Locked</Text>
          <Text style={styles.lockSubtitle}>
            RecoverPro contains sensitive information. Please unlock to proceed.
          </Text>
          <Button
            label="Unlock App"
            onPress={unlockApp}
            variant="primary"
            style={styles.button}
          />
        </View>
      )}
    </SecurityContext.Provider>
  );
}

const styles = StyleSheet.create({
  lockContainer: {
    backgroundColor: '#FAFAF9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 99999,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0C0A09',
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 14,
    color: '#57534E',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  button: {
    paddingHorizontal: 32,
  },
});
