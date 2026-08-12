import React, { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { WifiOff, Database } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, EmptyState, LoadingView, Card } from '@/components/ui';
import { fileUploadsApi, type UploadRowResponse } from '@/api/fileUploadsApi';

export default function UploadDataScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<UploadRowResponse[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const response = await fileUploadsApi.getRows(id, 0, 100);
      setRows(response.rows ?? []);
      setColumns(response.columns ?? []);
      setLoadError(false);
    } catch (e) {
      setLoadError(true);
    }
  }, [id]);

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

  if (loading) return <LoadingView label="Loading spreadsheet data..." />;

  return (
    <Screen edges={['top']}>
      <View style={{ gap: spacing.s4, paddingBottom: spacing.s4, flex: 1 }}>
        <View>
          <Text variant="title">Upload Data Rows</Text>
          <Text variant="caption" color="secondary">
            {rows.length} rows (Intentional UX divergence: per-row card viewer instead of grid editor)
          </Text>
        </View>

        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.s3 }}
          renderItem={({ item }) => (
            <Card style={{ padding: spacing.s4, gap: spacing.s2 }}>
              <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1 }}>
                Row #{item.rowNumber}
              </Text>
              <View style={{ gap: 4 }}>
                {columns.map((col) => (
                  <View key={col} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>{col}:</Text>
                    <Text variant="caption" color="primary">{item.data[col] || '—'}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}
          refreshing={refreshing}
          onRefresh={onRefresh}
          scrollEnabled={false}
          ListEmptyComponent={
            loadError ? (
              <EmptyState icon={WifiOff} title="Couldn't load rows" message="Pull down to try again." />
            ) : (
              <EmptyState
                icon={Database}
                title="No rows"
                message="Data rows imported into this file will show up here."
              />
            )
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({});
