import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { Text } from './Text';

export function LoadingView({ label }: { label?: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.s3, backgroundColor: colors.canvas }}>
      <ActivityIndicator size="large" color={colors.accent} />
      {label ? <Text variant="body" color="secondary">{label}</Text> : null}
    </View>
  );
}
