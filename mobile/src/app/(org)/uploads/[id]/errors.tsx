import React, { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, WifiOff } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, EmptyState, LoadingView, Card } from '@/components/ui';
import { fileUploadsApi, type FileProcessingErrorResponse } from '@/api/fileUploadsApi';

export default function UploadErrorsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<FileProcessingErrorResponse[]>([]);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const response = await fileUploadsApi.getUploadErrors(id, 0, 100);
      setErrors(response.content ?? []);
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

  if (loading) return <LoadingView label="Loading row errors..." />;

  return (
    <Screen edges={['top']}>
      <View style={{ gap: spacing.s4, paddingBottom: spacing.s4 }}>
        <View>
          <Text variant="title">Upload Errors</Text>
          <Text variant="caption" color="secondary">{errors.length} rows failed processing validation</Text>
        </View>

        <FlatList
          data={errors}
          keyExtractor={(item, index) => item.id || String(index)}
          contentContainerStyle={{ gap: spacing.s3 }}
          renderItem={({ item }) => (
            <Card style={{ padding: spacing.s4, gap: spacing.s2, borderLeftWidth: 3, borderLeftColor: colors.error }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1 }}>
                  Row #{item.rowNumber}
                </Text>
                {item.columnName ? (
                  <Text variant="caption" color="secondary" style={{ fontFamily: 'monospace' }}>
                    Col: {item.columnName}
                  </Text>
                ) : null}
              </View>

              <Text variant="body" color="primary">{item.errorMessage}</Text>

              {item.rawValue ? (
                <View style={{ backgroundColor: colors.subtle, padding: spacing.s2, borderRadius: 4, marginTop: 2 }}>
                  <Text variant="caption" color="secondary" style={{ fontFamily: 'monospace' }}>
                    Raw Value: {item.rawValue}
                  </Text>
                </View>
              ) : null}
            </Card>
          )}
          refreshing={refreshing}
          onRefresh={onRefresh}
          scrollEnabled={false}
          ListEmptyComponent={
            loadError ? (
              <EmptyState icon={WifiOff} title="Couldn't load error logs" message="Pull down to try again." />
            ) : (
              <EmptyState
                icon={AlertTriangle}
                title="All clear"
                message="No row processing errors logged for this batch."
              />
            )
          }
        />
      </View>
    </Screen>
  );
}
