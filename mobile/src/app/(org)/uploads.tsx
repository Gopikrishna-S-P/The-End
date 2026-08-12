import React, { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet, TextInput, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Search, WifiOff, X, CloudUpload } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, EmptyState, LoadingView, Card, Badge } from '@/components/ui';
import { fileUploadsApi, type FileUploadResponse } from '@/api/fileUploadsApi';
import { formatDate } from '@/utils/date';

export default function FileUploadsScreen() {
  const { colors, spacing, radius } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploads, setUploads] = useState<FileUploadResponse[]>([]);
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fileUploadsApi.list({ size: 100 });
      setUploads(response.content ?? []);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const getStatusTone = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'PROCESSING':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const filtered = uploads.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return u.originalFilename?.toLowerCase().includes(q) || u.uploadType?.toLowerCase().includes(q);
  });

  if (loading) return <LoadingView label="Loading files status..." />;

  return (
    <Screen edges={['top']}>
      <View style={{ gap: spacing.s4, paddingBottom: spacing.s4 }}>
        <View>
          <Text variant="title">File Uploads</Text>
          <Text variant="caption" color="secondary">{uploads.length} data ingestion files</Text>
        </View>

        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: spacing.s2,
          backgroundColor: colors.subtle, borderRadius: radius.md, paddingHorizontal: spacing.s3,
          borderWidth: 1, borderColor: colors.border,
        }}
        >
          <Search size={16} color={colors.ink3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search uploaded files..."
            placeholderTextColor={colors.ink3}
            style={{ flex: 1, paddingVertical: spacing.s3, color: colors.ink1, fontFamily: 'Inter_400Regular', fontSize: 15 }}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <X size={16} color={colors.ink3} />
            </Pressable>
          ) : null}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.s3 }}
          renderItem={({ item }) => (
            <Card style={{ padding: spacing.s4, gap: spacing.s2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1 }}>
                  {item.originalFilename}
                </Text>
                <Badge tone={getStatusTone(item.status)} label={item.status} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="caption" color="secondary">Type: {item.uploadType}</Text>
                <Text variant="caption" color="secondary">Rows: {item.totalRows} ({item.failedRows} failed)</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text variant="caption" color="tertiary">Uploaded: {formatDate(item.createdAt)}</Text>
              </View>
            </Card>
          )}
          refreshing={refreshing}
          onRefresh={onRefresh}
          scrollEnabled={false}
          ListEmptyComponent={
            loadError ? (
              <EmptyState icon={WifiOff} title="Couldn't load upload logs" message="Pull down to try again." />
            ) : (
              <EmptyState
                icon={CloudUpload}
                title="No uploads"
                message="Data files imported into the platform will list here."
              />
            )
          }
        />
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({});
