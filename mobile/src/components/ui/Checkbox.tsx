import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Text } from './Text';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  const { colors, spacing, radius } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3 }}
    >
      <View
        style={{
          width: 22, height: 22, borderRadius: radius.sm, borderWidth: 1.5,
          borderColor: checked ? colors.accent : colors.borderStrong,
          backgroundColor: checked ? colors.accent : 'transparent',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        {checked ? <Check size={14} color="#fff" /> : null}
      </View>
      <Text variant="body" style={{ flex: 1 }}>{label}</Text>
    </Pressable>
  );
}
