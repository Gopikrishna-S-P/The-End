import type { ComponentType } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { Text } from './Text';
import { Card } from './Card';

interface StatCardProps {
  icon: ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string;
  tone?: 'accent' | 'success' | 'warning';
}

export function StatCard({ icon: Icon, label, value, tone = 'accent' }: StatCardProps) {
  const { colors, spacing } = useTheme();
  const toneColor = { accent: colors.accent, success: colors.success, warning: colors.warnBorder }[tone];

  return (
    <Card style={{ flex: 1 }}>
      <View style={{ gap: spacing.s2 }}>
        <View style={{
          width: 32, height: 32, borderRadius: 8, backgroundColor: colors.accentSubtle,
          alignItems: 'center', justifyContent: 'center',
        }}
        >
          <Icon size={17} color={toneColor} />
        </View>
        <Text variant="title" style={{ fontSize: 20 }}>{value}</Text>
        <Text variant="caption" color="secondary">{label}</Text>
      </View>
    </Card>
  );
}
