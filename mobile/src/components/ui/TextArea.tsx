import React from 'react';
import { TextInput, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/useTheme';

interface TextAreaProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  numberOfLines?: number;
  error?: string;
  style?: StyleProp<ViewStyle>;
}

export function TextArea({
  label,
  value,
  onChangeText,
  placeholder,
  numberOfLines = 4,
  error,
  style,
}: TextAreaProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text variant="label" color="secondary" style={{ marginBottom: spacing.s1 }}>
          {label}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ink3}
        multiline
        numberOfLines={numberOfLines}
        style={[
          styles.input,
          {
            borderColor: error ? colors.error : colors.borderStrong,
            borderRadius: radius.sm,
            color: colors.ink1,
            padding: spacing.s3,
            backgroundColor: colors.surface,
            textAlignVertical: 'top',
          },
        ]}
      />
      {error && (
        <Text variant="caption" style={{ color: colors.error, marginTop: spacing.s1 }}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
  input: {
    borderWidth: 1,
    minHeight: 80,
  },
});
