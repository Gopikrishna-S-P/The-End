import React, { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { WifiOff, Activity, ShieldAlert, Award } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Screen, Text, EmptyState, LoadingView, Card, Badge, Divider } from '@/components/ui';
import { agentDetailApi, type AgentPerfResponse } from '@/api/agentDetailApi';
import { formatCurrency } from '@/utils/allocationHeuristics';
import type { VisitLogResponse } from '@/types/domain';

export default function AgentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors, spacing } = useTheme();

  const [loading, setLoading] = useState(true);
  const [perf, setPerf] = useState<AgentPerfResponse | null>(null);
  const [visits, setVisits] = useState<VisitLogResponse[]>([]);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!id || !user) return;
    try {
      const [performance, visitHistory] = await Promise.all([
        agentDetailApi.getPerformance(user.organizationId || '', id),
        agentDetailApi.getVisits(id),
      ]);
      setPerf(performance);
      setVisits(visitHistory);
      setLoadError(false);
    } catch (e) {
      setLoadError(true);
    }
  }, [id, user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  if (loading) return <LoadingView label="Loading executive details…" />;

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ gap: spacing.s4, paddingBottom: spacing.s4 }}>
        <View>
          <Text variant="title">Agent Performance</Text>
          <Text variant="caption" color="secondary">Roster metrics and history</Text>
        </View>

        {perf ? (
          <View style={{ gap: spacing.s3 }}>
            <Card style={{ padding: spacing.s4, gap: spacing.s3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s2 }}>
                <Award size={18} color={colors.accent} />
                <Text style={{ fontWeight: '700', fontSize: 16, color: colors.ink1 }}>
                  Efficiency Rank: #{perf.rankInOrg}
                </Text>
              </View>

              <Divider />

              <View style={styles.statRow}>
                <Text variant="body" color="secondary">Cases Assigned</Text>
                <Text style={styles.statVal}>{perf.totalAssigned}</Text>
              </View>
              <View style={styles.statRow}>
                <Text variant="body" color="secondary">Cases Visited</Text>
                <Text style={styles.statVal}>{perf.totalVisited}</Text>
              </View>
              <View style={styles.statRow}>
                <Text variant="body" color="secondary">Completion Rate</Text>
                <Text style={styles.statVal}>{perf.visitCompletionRate.toFixed(1)}%</Text>
              </View>
              <View style={styles.statRow}>
                <Text variant="body" color="secondary">Collection Efficiency</Text>
                <Text style={styles.statVal}>{perf.collectionEfficiency.toFixed(1)}%</Text>
              </View>
              <View style={styles.statRow}>
                <Text variant="body" color="secondary">Amount Collected</Text>
                <Text style={styles.statVal}>{formatCurrency(perf.amountCollected)}</Text>
              </View>
            </Card>
          </View>
        ) : null}

        <View>
          <Text variant="headline" style={{ marginBottom: spacing.s2 }}>Recent Logged Visits</Text>
          <FlatList
            data={visits}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: spacing.s2 }}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Card style={{ padding: spacing.s3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Loan: {item.loanNumber}</Text>
                  <Badge tone={item.approvalStatus === 'APPROVED' ? 'success' : 'warning'} label={item.approvalStatus} />
                </View>
                <Text variant="caption" color="secondary" style={{ marginTop: 2 }}>{item.gpsAddress || 'No location address logged'}</Text>
              </Card>
            )}
            ListEmptyComponent={
              <EmptyState
                icon={Activity}
                title="No visits recorded"
                message="Completed field actions will list here."
              />
            }
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statVal: {
    fontWeight: '700',
    fontSize: 14,
  },
});
