import React, { useCallback, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, FlatList,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  WifiOff, Building2, Users, CheckCircle, XCircle,
} from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, EmptyState, LoadingView, Card } from '@/components/ui';
import { platformApi, type OrganizationSummary } from '@/api/platformApi';

type Tab = 'orgs' | 'users';

function OrgCard({ org }: { org: OrganizationSummary }) {
  const { colors, spacing } = useTheme();
  return (
    <Card style={{ padding: spacing.s3, marginBottom: spacing.s2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1, marginRight: spacing.s2 }}>
          <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1 }}>{org.name}</Text>
          <Text variant="caption" color="secondary">Code: {org.code}</Text>
          {org.orgAdminEmail ? (
            <Text variant="caption" color="secondary">Admin: {org.orgAdminEmail}</Text>
          ) : null}
          <Text variant="caption" color="secondary">{org.userCount} user{org.userCount !== 1 ? 's' : ''}</Text>
        </View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          {org.isActive
            ? <CheckCircle size={16} color={colors.success} />
            : <XCircle size={16} color={colors.error} />}
          <Text variant="caption" color="secondary" style={{ fontSize: 10 }}>
            {org.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export default function PlatformSetupScreen() {
  const { colors, spacing } = useTheme();
  const [tab, setTab] = useState<Tab>('orgs');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);

  const load = useCallback(async () => {
    try {
      const list = await platformApi.listOrganizations();
      setOrgs(list);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  if (loading) return <LoadingView label="Loading platform setup…" />;

  if (loadError) {
    return (
      <Screen>
        <EmptyState
          icon={WifiOff}
          title="Setup unavailable"
          message="Could not load organizations. Check your connection."
        />
      </Screen>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'orgs', label: 'Organizations' },
    { key: 'users', label: 'Users' },
  ];

  return (
    <Screen edges={['top']}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: spacing.s4, paddingBottom: spacing.s2 }}>
          <Text variant="title">Platform Setup</Text>
          <Text variant="caption" color="secondary">Manage organizations and platform users</Text>
        </View>

        {/* Tab switcher */}
        <View style={[styles.tabRow, { marginHorizontal: spacing.s4, marginBottom: spacing.s3, borderColor: colors.border }]}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.tabBtn,
                  { backgroundColor: active ? colors.accent : 'transparent' },
                ]}
                onPress={() => setTab(t.key)}
                activeOpacity={0.7}
              >
                <Text
                  variant="caption"
                  style={{ fontWeight: '600', color: active ? colors.canvas : colors.ink2 }}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === 'orgs' ? (
          orgs.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No organizations"
              message="No organizations have been created on this platform yet."
            />
          ) : (
            <FlatList
              data={orgs}
              keyExtractor={(o) => o.id}
              renderItem={({ item }) => <OrgCard org={item} />}
              contentContainerStyle={{ paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 }}
            />
          )
        ) : (
          <EmptyState
            icon={Users}
            title="Platform Users"
            message="Platform-level admin user management is available on the web console."
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
