import React, { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { DollarSign, WifiOff } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, Card, Badge, EmptyState, LoadingView, Divider, Button } from '@/components/ui';
import { collectionsApi } from '@/api/collectionsApi';
import { formatCurrency } from '@/utils/allocationHeuristics';
import { formatDate } from '@/utils/date';
import { useToast } from '@/context/ToastContext';
import type { CollectionResponse } from '@/types/domain';

export default function CollectionsHubScreen() {
  const { user } = useAuth();
  const { colors, spacing } = useTheme();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collections, setCollections] = useState<CollectionResponse[]>([]);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const response = await collectionsApi.list({ size: 100 });
      setCollections(response.content ?? []);
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

  const shareCSV = async () => {
    try {
      const header = 'ID,Amount,Status,Date,Mode\n';
      const rows = collections
        .map((c) => `${c.id},${c.amount},${c.status},${c.collectionDate},${c.paymentMode}`)
        .join('\n');
      await Share.share({
        message: header + rows,
        title: 'Export Collections',
      });
    } catch (err) {
      showToast('Failed to export collections', { type: 'error' });
    }
  };

  const getStatusTone = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'DEPOSITED':
        return 'success';
      case 'REJECTED':
      case 'CANCELLED':
        return 'error';
      case 'PENDING_APPROVAL':
      default:
        return 'warning';
    }
  };

  if (loading) return <LoadingView label="Loading collections…" />;

  return (
    <Screen edges={['top']}>
      <View style={{ gap: spacing.s4, paddingBottom: spacing.s4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text variant="title">Collections</Text>
            <Text variant="caption" color="secondary">{collections.length} transaction records</Text>
          </View>
          <Button label="Export" onPress={shareCSV} variant="outline" fullWidth={false} size="md" />
        </View>

        <FlatList
          data={collections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.s3 }}
          renderItem={({ item }) => (
            <Card style={{ padding: spacing.s4, gap: spacing.s2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1, flex: 1 }}>
                  Collection #{item.id.slice(-6).toUpperCase()}
                </Text>
                <Badge tone={getStatusTone(item.status)} label={item.status.replace('_', ' ')} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="caption" color="secondary">Mode: {item.paymentMode}</Text>
                <Text variant="bodyMedium" style={{ fontWeight: '600', color: colors.accent }}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>

              <Divider style={{ marginVertical: 4 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="caption" color="secondary">{formatDate(item.collectionDate)}</Text>
                <Text variant="caption" color="tertiary">Agent: {item.submittedBy.slice(-6).toUpperCase()}</Text>
              </View>
            </Card>
          )}
          refreshing={refreshing}
          onRefresh={onRefresh}
          scrollEnabled={false}
          ListEmptyComponent={
            loadError ? (
              <EmptyState icon={WifiOff} title="Couldn't load collections" message="Pull down to try again." />
            ) : (
              <EmptyState
                icon={DollarSign}
                title="No collections recorded"
                message="Payments submitted by field agents will appear here."
              />
            )
          }
        />
      </View>
    </Screen>
  );
}
