import React from 'react';
import { View, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/useTheme';

interface Option {
  label: string;
  value: string;
}

interface ChipMultiSelectProps {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  style?: StyleProp<ViewStyle>;
}

export function ChipMultiSelect({ options, selectedValues, onChange, style }: ChipMultiSelectProps) {
  const { colors, spacing, radius } = useTheme();

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  return (
    <View style={[styles.container, { gap: spacing.s2 }, style]}>
      {options.map((opt) => {
        const isSelected = selectedValues.includes(opt.value);
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => toggleOption(opt.value)}
            style={[
              styles.chip,
              {
                borderRadius: radius.pill,
                backgroundColor: isSelected ? colors.accentSubtle : colors.subtle,
                borderColor: isSelected ? colors.accent : colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: isSelected ? colors.accent : colors.ink2,
                fontSize: 13,
                fontWeight: isSelected ? '600' : '400',
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
