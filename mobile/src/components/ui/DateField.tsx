import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Text } from './Text';

interface DateFieldProps {
  label?: string;
  required?: boolean;
  value?: string;
  onChange: (isoDate: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DateField({ label, required, value, onChange, minimumDate, maximumDate }: DateFieldProps) {
  const { colors, spacing, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const dateValue = value ? new Date(`${value}T00:00:00`) : new Date();

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
          backgroundColor: colors.subtle, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
          paddingHorizontal: spacing.s3, paddingVertical: spacing.s3,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <Text variant="body" color={value ? 'primary' : 'tertiary'}>{value ?? 'Select a date'}</Text>
        <CalendarDays size={18} color={colors.ink3} />
      </Pressable>

      {open ? (
        <View style={Platform.OS === 'ios' ? {
          backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
        } : undefined}
        >
          <DateTimePicker
            value={dateValue}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(event, selected) => {
              if (Platform.OS !== 'ios') setOpen(false);
              if (event.type === 'set' && selected) onChange(toIso(selected));
            }}
          />
          {Platform.OS === 'ios' ? (
            <Pressable onPress={() => setOpen(false)} style={{ padding: spacing.s3, alignItems: 'center' }}>
              <Text variant="bodyMedium" color="accent">Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
