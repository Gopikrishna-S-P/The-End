import React, { useCallback, useState } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  WifiOff, CreditCard, Clock, CheckCircle, AlertTriangle, XCircle, Ban,
} from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, EmptyState, LoadingView, Card, Badge } from '@/components/ui';
import { platformApi } from '@/api/platformApi';
import type { PlatformSubRow } from '@/api/platformApi';
import { formatDate } from '@/utils/date';

const PLAN_LABEL: Record<string, string> = {
  NONE: 'No plan',
  STARTER: 'Starter',
  GROWTH: 'Growth',
  ENTERPRISE: 'Enterprise',
};

function statusTone(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'ACTIVE':    return 'success';
    case 'TRIAL':     return 'warning';
    case 'PAST_DUE':  return 'error';
    case 'CANCELLED': return 'error';
    default:          return 'neutral';
  }
}

function StatusIcon({ status }: { status: string }) {
  const { colors } = useTheme();
  const sz = 14;
  switch (status) {
    case 'ACTIVE':    return <CheckCircle size={sz} color={colors.success} />;
    case 'TRIAL':     return <Clock size={sz} color={colors.warnBorder} />;
    case 'PAST_DUE':  return <AlertTriangle size={sz} color={colors.error} />;
    case 'CANCELLED': return <XCircle size={sz} color={colors.error} />;
    default:          return <Ban size={sz} color={colors.ink3} />;
  }
}

function SubCard({ row }: { row: PlatformSubRow }) {
  const { colors, spacing } = useTheme();
  const revenueINR = Math.round(row.lifetimeRevenue / 100);

  return (
    <Card style={{ padding: spacing.s3, marginBottom: spacing.s2 }}>
      {/* Header row */}
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, marginRight: spacing.s2 }}>
          <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1 }} numberOfLines={1}>
            {row.orgName}
          </Text>
          <Text variant="caption" color="secondary">{row.orgCode}</Text>
        </View>
        <Badge tone={statusTone(row.status)} label={row.status} />
      </View>

      {/* Plan + effective plan */}
      <View style={[styles.divider, { borderColor: colors.border }]} />
      <View style={styles.rowBetween}>
        <Text variant="caption" color="secondary">Plan</Text>
        <Text variant="label" style={{ color: colors.ink1, fontWeight: '600' }}>
          {PLAN_LABEL[row.plan] ?? row.plan}
          {row.compedPlan ? ` (comp: ${PLAN_LABEL[row.compedPlan]})` : ''}
        </Text>
      </View>

      {/* Trial info */}
      {row.status === 'TRIAL' && row.trialEndsAt ? (
        <View style={styles.rowBetween}>
          <Text variant="caption" color="secondary">Trial ends</Text>
          <Text variant="label" style={{ color: colors.warnInk }}>
            {formatDate(row.trialEndsAt)} · {row.trialDaysLeft}d left
          </Text>
        </View>
      ) : null}

      {/* Renewal */}
      {row.currentPeriodEnd && row.status === 'ACTIVE' ? (
        <View style={styles.rowBetween}>
          <Text variant="caption" color="secondary">
            {row.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'}
          </Text>
          <Text variant="label" style={{ color: colors.ink1 }}>{formatDate(row.currentPeriodEnd)}</Text>
        </View>
      ) : null}

      {/* Lifetime revenue */}
      <View style={styles.rowBetween}>
        <Text variant="caption" color="secondary">Lifetime revenue</Text>
        <Text variant="label" style={{ color: colors.ink1, fontWeight: '600' }}>
          {revenueINR > 0 ? `₹${revenueINR.toLocaleString('en-IN')}` : '₹0'}
        </Text>
      </View>

      {/* Stripe status */}
      <View style={styles.rowBetween}>
        <Text variant="caption" color="secondary">Stripe</Text>
        <Text variant="caption" style={{ color: row.stripeCustomerId ? colors.success : colors.ink3 }}>
          {row.stripeCustomerId ? 'Configured' : 'Not set up'}
        </Text>
      </View>
    </Card>
  );
}

export default function PlatformBillingScreen() {
  const { spacing } = useTheme();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PlatformSubRow[]>([]);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await platformApi.listSubscriptions();
      setRows(data);
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

  if (loading) return <LoadingView label="Loading subscriptions…" />;

  if (loadError) {
    return (
      <Screen>
        <EmptyState
          icon={WifiOff}
          title="Billing unavailable"
          message="Could not load subscription data. Check your connection."
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: spacing.s4, paddingBottom: spacing.s3 }}>
          <Text variant="title">Platform Billing</Text>
          <Text variant="caption" color="secondary">
            {rows.length} organization{rows.length !== 1 ? 's' : ''} · per-org subscription status
          </Text>
        </View>

        {rows.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No subscriptions yet"
            message="Organization subscriptions will appear here once orgs are created."
          />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(r) => r.orgId}
            renderItem={({ item }) => <SubCard row={item} />}
            contentContainerStyle={{ paddingHorizontal: spacing.s4, paddingBottom: spacing.s4 }}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  divider: {
    borderTopWidth: 1,
    marginVertical: 8,
  },
});
