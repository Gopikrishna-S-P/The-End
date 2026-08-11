import React, { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Columns, WifiOff } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Screen, Text, EmptyState, LoadingView, Card, Badge } from '@/components/ui';
import { columnSchemasApi, type ColumnSchemaResponse } from '@/api/columnSchemasApi';

export default function ColumnSchemaScreen() {
  const { user } = useAuth();
  const { colors, spacing } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [columns, setColumns] = useState<ColumnSchemaResponse[]>([]);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const response = await columnSchemasApi.list(user.organizationId || '', 'ALLOCATION');
      setColumns(response ?? []);
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

  if (loading) return <LoadingView label="Loading column schemas..." />;

  return (
    <Screen edges={['top']}>
      <View style={{ gap: spacing.s4, paddingBottom: spacing.s4 }}>
        <View>
          <Text variant="title">Column Schema</Text>
          <Text variant="caption" color="secondary">{columns.length} custom database fields configured</Text>
        </View>

        <FlatList
          data={columns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.s3 }}
          renderItem={({ item }) => (
            <Card style={{ padding: spacing.s4, gap: spacing.s2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1 }}>
                  {item.displayName}
                </Text>
                <Badge tone="neutral" label={item.dataType} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="caption" color="secondary">System Name: {item.name}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {item.isRequired ? <Badge tone="warning" label="Required" /> : null}
                  {item.isSearchable ? <Badge tone="info" label="Searchable" /> : null}
                </View>
              </View>
            </Card>
          )}
          refreshing={refreshing}
          onRefresh={onRefresh}
          scrollEnabled={false}
          ListEmptyComponent={
            loadError ? (
              <EmptyState icon={WifiOff} title="Couldn't load schemas" message="Pull down to try again." />
            ) : (
              <EmptyState
                icon={Columns}
                title="No custom schemas"
                message="Data columns mapped under customization rules will show up here."
              />
            )
          }
        />
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({});
