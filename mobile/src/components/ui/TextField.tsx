import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { Text } from './Text';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
}

export function TextField({ label, error, required, style, ...props }: TextFieldProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={{ gap: spacing.s1 + 2 }}>
      {label ? (
        <Text variant="label" color="secondary">
          {label}{required ? <Text variant="label" color="error"> *</Text> : null}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.ink3}
        style={[
          {
            backgroundColor: colors.subtle,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: error ? colors.error : colors.border,
            paddingHorizontal: spacing.s3,
            paddingVertical: spacing.s3,
            fontSize: 15,
            fontFamily: 'Inter_400Regular',
            color: colors.ink1,
          },
          props.multiline ? { minHeight: 90, textAlignVertical: 'top' } : null,
          style,
        ]}
        {...props}
      />
      {error ? <Text variant="caption" color="error">{error}</Text> : null}
    </View>
  );
}
