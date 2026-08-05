import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { TriangleAlert } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/useTheme';

/** Persistent, always-reachable panic button — rendered once above the root navigator. */
export function SosFloatingButton() {
  const { colors, shadow } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={() => router.push('/sos')}
      hitSlop={8}
      style={[
        {
          position: 'absolute',
          right: 16,
          bottom: insets.bottom + 84,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.error,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          elevation: 8,
        },
        shadow.lg,
      ]}
    >
      <TriangleAlert size={26} color="#fff" />
    </Pressable>
  );
}
