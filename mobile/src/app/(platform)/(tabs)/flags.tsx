import React, { useCallback, useState } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { WifiOff, Globe, Building2, Flag } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, EmptyState, LoadingView, Card, Badge } from '@/components/ui';
import { featureFlagsApi, type FeatureFlag } from '@/api/featureFlagsApi';

type Tab = 'global' | 'overrides';

function FlagRow({ flag, onToggle, toggling }: {
  flag: FeatureFlag;
  onToggle: (flag: FeatureFlag, newValue: boolean) => void;
  toggling: boolean;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Card style={{ padding: spacing.s3, marginBottom: spacing.s2 }}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, marginRight: spacing.s3 }}>
          <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1 }} numberOfLines={1}>
            {flag.flagKey}
          </Text>
          {flag.description ? (
            <Text variant="caption" color="secondary" numberOfLines={2}>{flag.description}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            <Badge
              tone={flag.source === 'MANUAL' ? 'warning' : 'neutral'}
              label={flag.source}
            />
            {flag.organizationId ? (
              <Badge tone="neutral" label="ORG" />
            ) : (
              <Badge tone="success" label="GLOBAL" />
            )}
          </View>
        </View>
        <Switch
          value={flag.enabled}
          onValueChange={(val) => onToggle(flag, val)}
          disabled={toggling}
          trackColor={{ false: colors.border, true: colors.accentSubtle }}
          thumbColor={flag.enabled ? colors.accent : colors.ink3}
        />
      </View>
    </Card>
  );
}

export default function FeatureFlagsScreen() {
  const { colors, spacing } = useTheme();
  const [tab, setTab] = useState<Tab>('global');
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await featureFlagsApi.list(null);
      setFlags(data ?? []);
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

  const handleToggle = useCallback(async (flag: FeatureFlag, newValue: boolean) => {
    setTogglingKey(flag.flagKey);
    try {
      await featureFlagsApi.upsert({
        organizationId: flag.organizationId,
        flagKey: flag.flagKey,
        enabled: newValue,
        description: flag.description ?? undefined,
      });
      setFlags((prev) =>
        prev.map((f) =>
          f.flagKey === flag.flagKey && f.organizationId === flag.organizationId
            ? { ...f, enabled: newValue, source: 'MANUAL' }
            : f
        )
      );
    } catch {
      Alert.alert('Error', 'Could not update flag. Please try again.');
    } finally {
      setTogglingKey(null);
    }
  }, []);

  const globalFlags = flags.filter((f) => f.organizationId === null);
  const orgOverrides = flags.filter((f) => f.organizationId !== null);

  const TABS: { key: Tab; label: string; icon: typeof Globe }[] = [
    { key: 'global', label: 'Global', icon: Globe },
    { key: 'overrides', label: 'Org Overrides', icon: Building2 },
  ];

  if (loading) return <LoadingView label="Loading feature flags…" />;

  if (loadError) {
    return (
      <Screen>
        <EmptyState
          icon={WifiOff}
          title="Flags unavailable"
          message="Could not load feature flags. Check your connection."
        />
      </Screen>
    );
  }

  const displayedFlags = tab === 'global' ? globalFlags : orgOverrides;

  return (
    <Screen edges={['top']}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: spacing.s4, paddingBottom: spacing.s2 }}>
          <Text variant="title">Feature Flags</Text>
          <Text variant="caption" color="secondary">
            {globalFlags.length} global · {orgOverrides.length} org override{orgOverrides.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Tab switcher */}
        <View style={[styles.tabRow, { marginHorizontal: spacing.s4, marginBottom: spacing.s3, borderColor: colors.border }]}>
          {TABS.map((t) => {
            const active = tab === t.key;
            const Icon = t.icon;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, { backgroundColor: active ? colors.accent : 'transparent' }]}
                onPress={() => setTab(t.key)}
                activeOpacity={0.7}
              >
                <Icon size={13} color={active ? colors.canvas : colors.ink2} />
                <Text
                  variant="caption"
                  style={{ fontWeight: '600', color: active ? colors.canvas : colors.ink2, marginLeft: 4 }}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {displayedFlags.length === 0 ? (
          <EmptyState
            icon={Flag}
            title={tab === 'global' ? 'No global flags' : 'No org overrides'}
            message={
              tab === 'global'
                ? 'No global feature flags have been configured yet.'
                : 'No per-organization overrides are active.'
            }
          />
        ) : (
          <FlatList
            data={displayedFlags}
            keyExtractor={(f) => `${f.flagKey}-${f.organizationId ?? 'global'}`}
            renderItem={({ item }) => (
              <FlagRow
                flag={item}
                onToggle={handleToggle}
                toggling={togglingKey === item.flagKey}
              />
            )}
            contentContainerStyle={{ paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 }}
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
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
