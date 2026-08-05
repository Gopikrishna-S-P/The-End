import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import type { Type } from '@/theme/tokens';

type Variant = keyof typeof Type;

interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'success' | 'error' | 'inverse';
}

const FONT_BY_WEIGHT: Record<string, string> = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
};

export function Text({ variant = 'body', color = 'primary', style, ...props }: TextProps) {
  const { colors, type } = useTheme();

  const colorMap = {
    primary: colors.ink1,
    secondary: colors.ink2,
    tertiary: colors.ink3,
    accent: colors.accent,
    success: colors.success,
    error: colors.error,
    inverse: colors.white,
  };

  const variantStyle = type[variant];
  const fontFamily = FONT_BY_WEIGHT[variantStyle.fontWeight] ?? 'Inter_400Regular';

  return (
    <RNText
      style={[
        { color: colorMap[color], fontFamily },
        variantStyle,
        variant === 'eyebrow' ? { textTransform: 'uppercase' } : null,
        style,
      ]}
      {...props}
    />
  );
}
