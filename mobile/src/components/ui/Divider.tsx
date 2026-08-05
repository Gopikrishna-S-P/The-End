import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/useTheme';

interface DividerProps {
  style?: StyleProp<ViewStyle>;
}

export function Divider({ style }: DividerProps) {
  const { colors } = useTheme();
  return <View style={[{ height: 1, backgroundColor: colors.border }, style]} />;
}
