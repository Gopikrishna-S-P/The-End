import { Stack } from 'expo-router';
import { useTheme } from '@/theme/useTheme';

export default function PlatformLayout() {
  const { colors } = useTheme();

  return (
    <Stack screenOptions={{
      headerShown: false,
      headerStyle: { backgroundColor: colors.canvas },
      headerTintColor: colors.ink1,
      contentStyle: { backgroundColor: colors.canvas },
    }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="revenue-trend"
        options={{ headerShown: true, title: 'Revenue Trend', presentation: 'card' }}
      />
    </Stack>
  );
}
