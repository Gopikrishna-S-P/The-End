import React, { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { WifiOff, ShieldAlert, Award } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Screen, Text, EmptyState, LoadingView, Card } from '@/components/ui';
import { kpiApi, type KpiMetricResponse } from '@/api/kpiApi';

export default function KpiDashboardScreen() {
  const { user } = useAuth();
  const { colors, spacing } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<KpiMetricResponse[]>([]);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const response = await kpiApi.getOrgMetrics(user.organizationId || '');
      setMetrics(response ?? []);
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

  if (loading) return <LoadingView label="Loading key metrics..." />;

  return (
    <Screen edges={['top']}>
      <View style={{ gap: spacing.s4, paddingBottom: spacing.s4, flex: 1 }}>
        <View>
          <Text variant="title">KPI Dashboard</Text>
          <Text variant="caption" color="secondary">Key indicators and performance targets</Text>
        </View>

        <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ flexDirection: 'column' }}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { width: 140 }]}>Metric</Text>
            <Text style={[styles.headerCell, { width: 90 }]}>Target</Text>
            <Text style={[styles.headerCell, { width: 90 }]}>Current</Text>
            <Text style={[styles.headerCell, { width: 90 }]}>Status</Text>
          </View>

          <FlatList
            data={metrics}
            keyExtractor={(item) => item.metricName}
            contentContainerStyle={{ gap: spacing.s2 }}
            renderItem={({ item }) => (
              <View style={styles.tableRow}>
                <Text style={[styles.cell, { width: 140, fontWeight: '700' }]}>{item.metricName}</Text>
                <Text style={[styles.cell, { width: 90 }]}>{item.targetValue}</Text>
                <Text style={[styles.cell, { width: 90 }]}>{item.currentValue}</Text>
                <Text style={[styles.cell, { width: 90, color: item.status === 'ACHIEVED' ? colors.success : colors.error }]}>
                  {item.status}
                </Text>
              </View>
            )}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListEmptyComponent={
              loadError ? (
                <EmptyState icon={WifiOff} title="Couldn't load KPIs" message="Pull down to try again." />
              ) : (
                <EmptyState
                  icon={ShieldAlert}
                  title="No KPIs tracked"
                  message="Active key metrics targets will appear here."
                />
              )
            }
          />
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 10,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerCell: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  cell: {
    fontSize: 13,
  },
});
