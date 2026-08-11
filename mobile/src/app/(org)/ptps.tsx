import React, { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { TrendingUp, WifiOff } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, Card, Badge, EmptyState, LoadingView, Divider } from '@/components/ui';
import { ptpsApi } from '@/api/ptpsApi';
import { formatCurrency } from '@/utils/allocationHeuristics';
import { formatDate } from '@/utils/date';
import type { PtpResponse } from '@/types/domain';

export default function PtpListScreen() {
  const { user } = useAuth();
  const { colors, spacing } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ptps, setPtps] = useState<PtpResponse[]>([]);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const response = await ptpsApi.list({ size: 100 });
      setPtps(response.content ?? []);
      setLoadError(false);
    } catch (e) {
      setLoadError(true);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const getPtpBadgeTone = (status: string) => {
    switch (status) {
      case 'FULFILLED':
        return 'success';
      case 'PARTIALLY_FULFILLED':
        return 'info';
      case 'BROKEN':
        return 'error';
      case 'CANCELLED':
        return 'neutral';
      case 'PENDING':
      default:
        return 'warning';
    }
  };

  if (loading) return <LoadingView label="Loading Promises to Pay…" />;

  return (
    <Screen edges={['top']}>
      <View style={{ gap: spacing.s4, paddingBottom: spacing.s4 }}>
        <View>
          <Text variant="title">Promises to Pay</Text>
          <Text variant="caption" color="secondary">{ptps.length} active promises recorded</Text>
        </View>

        <FlatList
          data={ptps}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.s3 }}
          renderItem={({ item }) => (
            <Card style={{ padding: spacing.s4, gap: spacing.s2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1, flex: 1 }}>
                  {item.borrowerName || 'Unknown Borrower'}
                </Text>
                <Badge tone={getPtpBadgeTone(item.status)} label={item.status} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="caption" color="secondary">Loan: {item.loanNumber}</Text>
                <Text variant="bodyMedium" style={{ fontWeight: '600', color: colors.accent }}>
                  {formatCurrency(item.promisedAmount)}
                </Text>
              </View>

              <Divider style={{ marginVertical: 4 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="caption" color="secondary">Promised: {formatDate(item.promisedDate)}</Text>
                <Text variant="caption" color="tertiary">Logged by: {item.agentName}</Text>
              </View>
            </Card>
          )}
          refreshing={refreshing}
          onRefresh={onRefresh}
          scrollEnabled={false} // Since nested inside Screen's ScrollView
          ListEmptyComponent={
            loadError ? (
              <EmptyState icon={WifiOff} title="Couldn't load PTPs" message="Pull down to try again." />
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="No PTPs found"
                message="Promises to Pay logged by the team will be listed here."
              />
            )
          }
        />
      </View>
    </Screen>
  );
}
