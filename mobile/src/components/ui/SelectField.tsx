import { useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { ChevronDown, Check, X } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Text } from './Text';

export interface SelectOption<T extends string> {
  label: string;
  value: T;
}

interface SelectFieldProps<T extends string> {
  label?: string;
  required?: boolean;
  placeholder?: string;
  value?: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  error?: string;
}

export function SelectField<T extends string>({
  label, required, placeholder = 'Select…', value, options, onChange, error,
}: SelectFieldProps<T>) {
  const { colors, spacing, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={{ gap: spacing.s1 + 2 }}>
      {label ? (
        <Text variant="label" color="secondary">
          {label}{required ? <Text variant="label" color="error"> *</Text> : null}
        </Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: colors.subtle,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: error ? colors.error : colors.border,
          paddingHorizontal: spacing.s3,
          paddingVertical: spacing.s3,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text variant="body" color={selected ? 'primary' : 'tertiary'}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color={colors.ink3} />
      </Pressable>
      {error ? <Text variant="caption" color="error">{error}</Text> : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setOpen(false)}>
          <Pressable
            style={{
              marginTop: 'auto',
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              maxHeight: '70%',
              paddingBottom: spacing.s6,
            }}
          >
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              padding: spacing.s4, borderBottomWidth: 1, borderBottomColor: colors.border,
            }}
            >
              <Text variant="headline">{label ?? 'Select'}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <X size={20} color={colors.ink2} />
              </Pressable>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { onChange(item.value); setOpen(false); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: spacing.s4, paddingVertical: spacing.s4,
                    borderBottomWidth: 1, borderBottomColor: colors.border,
                  }}
                >
                  <Text variant="body">{item.label}</Text>
                  {item.value === value ? <Check size={18} color={colors.accent} /> : null}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
