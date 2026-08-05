import { useColorScheme } from 'react-native';
import { DarkColors, LightColors, Radius, Shadow, Spacing, Type } from './tokens';

export function useTheme() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? DarkColors : LightColors;
  return { colors, spacing: Spacing, radius: Radius, type: Type, shadow: Shadow, isDark: scheme === 'dark' };
}

export type Theme = ReturnType<typeof useTheme>;
