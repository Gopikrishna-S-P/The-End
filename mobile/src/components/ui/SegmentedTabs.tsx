import React from 'react';
import { View, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/useTheme';

interface Tab {
  key: string;
  title: string;
}

interface SegmentedTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedTabs({ tabs, activeTab, onChange, style }: SegmentedTabsProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, { borderColor: colors.border }, style]}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              { paddingVertical: spacing.s2 + 2 },
              isActive && { borderBottomColor: colors.accent },
            ]}
            onPress={() => onChange(tab.key)}
          >
            <Text
              variant="bodyMedium"
              style={{
                color: isActive ? colors.accent : colors.ink2,
                fontWeight: isActive ? '600' : '400',
              }}
            >
              {tab.title}
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
    borderBottomWidth: 1,
    width: '100%',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
});
