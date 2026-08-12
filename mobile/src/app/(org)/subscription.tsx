import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { WifiOff, CreditCard } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, EmptyState, LoadingView, Card, Badge } from '@/components/ui';
import { subscriptionApi, type SubscriptionInfo } from '@/api/subscriptionApi';
import { formatDate } from '@/utils/date';

export default function SubscriptionScreen() {
  const { colors, spacing } = useTheme();

  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await subscriptionApi.get();
      setSub(response);
      setLoadError(false);
    } catch (e) {
      setLoadError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  if (loading) return <LoadingView label="Loading subscription details..." />;

  if (loadError || !sub) {
    return (
      <Screen>
        <EmptyState
          icon={WifiOff}
          title="Billing details unavailable"
          message="Failed to load subscription status. Pull down to try again."
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ gap: spacing.s4, paddingBottom: spacing.s4 }}>
        <View>
          <Text variant="title">Subscription & Billing</Text>
          <Text variant="caption" color="secondary">Manage your organization's licensing plan</Text>
        </View>

        <Card style={{ padding: spacing.s4, gap: spacing.s3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1 }}>
              Plan: {sub.plan}
            </Text>
            <Badge tone={sub.status === 'ACTIVE' ? 'success' : 'warning'} label={sub.status} />
          </View>

          <View style={styles.row}>
            <Text variant="caption" color="secondary">Trial Days Left:</Text>
            <Text variant="body" color="primary">{sub.trialDaysLeft} days</Text>
          </View>

          {sub.currentPeriodEnd ? (
            <View style={styles.row}>
              <Text variant="caption" color="secondary">Renews On:</Text>
              <Text variant="body" color="primary">{formatDate(sub.currentPeriodEnd)}</Text>
            </View>
          ) : null}

          <View style={styles.row}>
            <Text variant="caption" color="secondary">Stripe Customer:</Text>
            <Text variant="body" color="primary">{sub.hasStripeCustomer ? 'Configured' : 'Not setup'}</Text>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 8,
  },
});
