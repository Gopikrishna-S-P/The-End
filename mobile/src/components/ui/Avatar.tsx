import { View } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { Text } from './Text';

function initialsOf(firstName?: string, lastName?: string): string {
  const a = firstName?.trim()?.[0] ?? '';
  const b = lastName?.trim()?.[0] ?? '';
  return (a + b).toUpperCase() || '?';
}

export function Avatar({ firstName, lastName, size = 44 }: { firstName?: string; lastName?: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: colors.accentSubtle,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text variant="bodyMedium" color="accent" style={{ fontSize: size * 0.38 }}>
        {initialsOf(firstName, lastName)}
      </Text>
    </View>
  );
}
