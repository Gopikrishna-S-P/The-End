import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/useTheme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}

export function Screen({ children, scroll = true, padded = true, onRefresh, refreshing, edges }: ScreenProps) {
  const { colors, spacing } = useTheme();

  const content = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={padded ? { padding: spacing.s4, paddingBottom: spacing.s8 } : undefined}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded ? { padding: spacing.s4 } : null]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.canvas }]} edges={edges as any}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
