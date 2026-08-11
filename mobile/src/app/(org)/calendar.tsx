import React, { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { CalendarOff, WifiOff } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Screen, Text, EmptyState, LoadingView, Card } from '@/components/ui';
import { calendarApi, type HolidayCalendar } from '@/api/calendarApi';
import { formatDate } from '@/utils/date';

export default function CalendarScreen() {
  const { user } = useAuth();
  const { colors, spacing } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [holidays, setHolidays] = useState<HolidayCalendar[]>([]);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const response = await calendarApi.getHolidays(user.organizationId || '', 0, 100);
      setHolidays(response.content ?? []);
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

  if (loading) return <LoadingView label="Loading calendar..." />;

  return (
    <Screen edges={['top']}>
      <View style={{ gap: spacing.s4, paddingBottom: spacing.s4 }}>
        <View>
          <Text variant="title">Holiday Calendar</Text>
          <Text variant="caption" color="secondary">{holidays.length} registered holidays</Text>
        </View>

        <FlatList
          data={holidays}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.s3 }}
          renderItem={({ item }) => (
            <Card style={{ padding: spacing.s4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1 }}>
                  {formatDate(item.holidayDate)}
                </Text>
                <Text variant="caption" color="secondary">{item.description || 'No description provided'}</Text>
              </View>
            </Card>
          )}
          refreshing={refreshing}
          onRefresh={onRefresh}
          scrollEnabled={false}
          ListEmptyComponent={
            loadError ? (
              <EmptyState icon={WifiOff} title="Couldn't load calendar" message="Pull down to try again." />
            ) : (
              <EmptyState
                icon={CalendarOff}
                title="No holidays configured"
                message="Registered non-working organization holidays will appear here."
              />
            )
          }
        />
      </View>
    </Screen>
  );
}
