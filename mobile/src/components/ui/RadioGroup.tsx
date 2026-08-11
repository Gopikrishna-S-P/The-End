import React from 'react';
import { View, TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/useTheme';

interface Option {
  label: string;
  value: string;
}

interface RadioGroupProps {
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function RadioGroup({ options, value, onChange, style }: RadioGroupProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, { gap: spacing.s3 }, style]}>
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={styles.item}
            onPress={() => onChange(opt.value)}
          >
            <View
              style={[
                styles.circle,
                { borderColor: isSelected ? colors.accent : colors.borderStrong },
              ]}
            >
              {isSelected && (
                <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              )}
            </View>
            <Text style={{ color: colors.ink1 }}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
