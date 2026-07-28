import { useState } from 'react';
import { View } from 'react-native';
import { LogOut, Mail, ShieldCheck, Building2, type LucideIcon } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme, type Theme } from '@/theme/useTheme';
import { Screen, Text, Button, Card, Avatar, Divider, Badge } from '@/components/ui';

export default function ProfileScreen() {
  const { user, role, logout } = useAuth();
  const { spacing, colors } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: spacing.s5 }}>
        <View style={{ alignItems: 'center', gap: spacing.s3, paddingTop: spacing.s4 }}>
          <Avatar firstName={user?.firstName} lastName={user?.lastName} size={72} />
          <View style={{ alignItems: 'center' }}>
            <Text variant="headline">{user?.firstName} {user?.lastName}</Text>
            {role ? <Badge tone="accent" label={role} /> : null}
          </View>
        </View>

        <Card style={{ gap: 0 }}>
          <Row icon={Mail} label="Email" value={user?.email ?? '—'} colors={colors} spacing={spacing} />
          <Divider />
          <Row icon={Building2} label="Organization" value={user?.organizationId ? 'Assigned' : 'Not linked'} colors={colors} spacing={spacing} />
          <Divider />
          <Row icon={ShieldCheck} label="Two-factor auth" value={user?.mfaEnabled ? 'Enabled' : 'Not enabled'} colors={colors} spacing={spacing} />
        </Card>

        <Button label="Log out" variant="outline" onPress={onLogout} loading={loggingOut} icon={<LogOut size={16} color={colors.ink1} />} />

        <Text variant="caption" color="tertiary" style={{ textAlign: 'center' }}>RecoverPro Field · v1.0.0</Text>
      </View>
    </Screen>
  );
}

interface RowProps {
  icon: LucideIcon;
  label: string;
  value: string;
  colors: Theme['colors'];
  spacing: Theme['spacing'];
}

function Row({ icon: Icon, label, value, colors, spacing }: RowProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3, paddingVertical: spacing.s3 }}>
      <View style={{
        width: 32, height: 32, borderRadius: 16, backgroundColor: colors.subtle,
        alignItems: 'center', justifyContent: 'center',
      }}
      >
        <Icon size={16} color={colors.ink2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="caption" color="secondary">{label}</Text>
        <Text variant="body">{value}</Text>
      </View>
    </View>
  );
}
