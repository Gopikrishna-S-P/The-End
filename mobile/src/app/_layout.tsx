import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
} from '@expo-google-fonts/inter';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoadingView } from '@/components/ui';
import { useTheme } from '@/theme/useTheme';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) return <LoadingView />;

  const isAuthenticated = !!user;

  return (
    <Stack screenOptions={{
      headerShown: false,
      headerStyle: { backgroundColor: colors.canvas },
      headerTintColor: colors.ink1,
      contentStyle: { backgroundColor: colors.canvas },
    }}
    >
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="case/[id]/index" options={{ headerShown: true, title: 'Case detail' }} />
        <Stack.Screen
          name="case/[id]/visit"
          options={{ headerShown: true, title: 'Log a visit', presentation: 'modal' }}
        />
        <Stack.Screen
          name="case/[id]/ptp"
          options={{ headerShown: true, title: 'Promise to pay', presentation: 'modal' }}
        />
        <Stack.Screen
          name="case/[id]/collection"
          options={{ headerShown: true, title: 'Record collection', presentation: 'modal' }}
        />
        <Stack.Screen
          name="case/[id]/payment-link"
          options={{ headerShown: true, title: 'Send payment link', presentation: 'modal' }}
        />
      </Stack.Protected>

      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)/login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </AuthProvider>
  );
}
