import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type Size = 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label, onPress, variant = 'primary', size = 'lg', loading, disabled, icon, fullWidth = true, style,
}: ButtonProps) {
  const { colors, spacing, radius } = useTheme();
  const isDisabled = disabled || loading;

  const palette: Record<Variant, { bg: string; border: string; text: string }> = {
    primary: { bg: colors.accent, border: colors.accent, text: colors.white },
    secondary: { bg: colors.subtle, border: colors.subtle, text: colors.ink1 },
    outline: { bg: 'transparent', border: colors.borderStrong, text: colors.ink1 },
    danger: { bg: colors.error, border: colors.error, text: colors.white },
    ghost: { bg: 'transparent', border: 'transparent', text: colors.accent },
  };
  const p = palette[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: p.bg,
          borderColor: p.border,
          borderRadius: radius.md,
          paddingVertical: size === 'lg' ? spacing.s3 + 2 : spacing.s2 + 2,
          paddingHorizontal: spacing.s5,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s2 }}>
        {loading ? <ActivityIndicator size="small" color={p.text} /> : icon}
        <Text variant="bodyMedium" style={{ color: p.text }}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
