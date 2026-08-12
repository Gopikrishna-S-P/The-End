import React, { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { WifiOff, ClipboardCheck } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, EmptyState, LoadingView, Card, Badge } from '@/components/ui';
import { attendanceApi, type AttendanceRecord } from '@/api/attendanceApi';

export default function MyAttendanceScreen() {
  const { colors, spacing } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      const today = new Date();
      const past = new Date();
      past.setDate(past.getDate() - 30);
      const todayIso = today.toISOString().split('T')[0];
      const pastIso = past.toISOString().split('T')[0];

      const response = await attendanceApi.me(pastIso, todayIso);
      setRecords(response ?? []);
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

  if (loading) return <LoadingView label="Loading your attendance..." />;

  return (
    <Screen edges={['top']}>
      <View style={{ gap: spacing.s4, paddingBottom: spacing.s4 }}>
        <View>
          <Text variant="title">My Attendance</Text>
          <Text variant="caption" color="secondary">Logs representing past 30 days check-ins</Text>
        </View>

        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.s3 }}
          renderItem={({ item }) => {
            const dayLabel = new Date(item.attendanceDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
            const time = new Date(item.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <Card style={{ padding: spacing.s4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1 }}>
                    {dayLabel}
                  </Text>
                  <Text variant="caption" color="secondary">Check-in at: {time}</Text>
                </View>

                {item.lat && item.lng ? (
                  <Badge tone="success" label="GPS Recorded" />
                ) : (
                  <Badge tone="neutral" label="No GPS" />
                )}
              </Card>
            );
          }}
          refreshing={refreshing}
          onRefresh={onRefresh}
          scrollEnabled={false}
          ListEmptyComponent={
            loadError ? (
              <EmptyState icon={WifiOff} title="Couldn't load logs" message="Pull down to try again." />
            ) : (
              <EmptyState
                icon={ClipboardCheck}
                title="No logs found"
                message="Your past attendance and check-in records will list here."
              />
            )
          }
        />
      </View>
    </Screen>
  );
}
