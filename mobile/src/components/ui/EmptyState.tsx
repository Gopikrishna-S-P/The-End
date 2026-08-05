import type { ComponentType } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { Text } from './Text';

interface EmptyStateProps {
  icon?: ComponentType<{ size?: number; color?: string }>;
  title: string;
  message?: string;
}

export function EmptyState({ icon: Icon, title, message }: EmptyStateProps) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.s8, gap: spacing.s3 }}>
      {Icon ? (
        <View style={{
          width: 56, height: 56, borderRadius: 28, backgroundColor: colors.subtle,
          alignItems: 'center', justifyContent: 'center',
        }}
        >
          <Icon size={26} color={colors.ink3} />
        </View>
      ) : null}
      <Text variant="bodyMedium" style={{ textAlign: 'center' }}>{title}</Text>
      {message ? <Text variant="caption" color="secondary" style={{ textAlign: 'center', maxWidth: 260 }}>{message}</Text> : null}
    </View>
  );
}
