import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { CalendarCheck, IndianRupee, Handshake, MapPinCheck } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, Button, Card, StatCard, EmptyState, LoadingView } from '@/components/ui';
import { CaseRow } from '@/components/CaseRow';
import { dailyDispatchApi } from '@/api/dailyDispatchApi';
import { allocationsApi } from '@/api/allocationsApi';
import { attendanceApi } from '@/api/attendanceApi';
import { collectionsApi } from '@/api/collectionsApi';
import { ptpsApi } from '@/api/ptpsApi';
import { todayIso, formatTime } from '@/utils/date';
import { formatCurrency } from '@/utils/allocationHeuristics';
import { extractApiError } from '@/utils/extractApiError';
import type { AllocationResponse } from '@/types/domain';

export default function HomeScreen() {
  const { user } = useAuth();
  const { spacing } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayCases, setTodayCases] = useState<AllocationResponse[]>([]);
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [collectionsToday, setCollectionsToday] = useState<number | null>(null);
  const [ptpsDueToday, setPtpsDueToday] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const today = todayIso();

    const casesPromise = dailyDispatchApi.myList(today).catch(async () => {
      const paged = await allocationsApi.getMyCases(user.id, { size: 50 }).catch(() => null);
      return paged?.content ?? [];
    });

    const attendancePromise = attendanceApi.me(today, today).catch(() => []);
    const reportPromise = collectionsApi.myDailyReport(user.id, today).catch(() => null);
    const ptpPromise = ptpsApi.list({ status: 'PENDING', promisedDateFrom: today, promisedDateTo: today, size: 1 }).catch(() => null);

    const [cases, attendance, report, ptps] = await Promise.all([
      casesPromise, attendancePromise, reportPromise, ptpPromise,
    ]);

    setTodayCases(cases);
    setCheckedInAt(attendance[0]?.checkedInAt ?? null);
    setCollectionsToday(report?.totalAmountSubmitted ?? null);
    setPtpsDueToday(ptps?.totalElements ?? null);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  };

  const onCheckIn = async () => {
    setCheckInError(null);
    setCheckingIn(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let coords: { lat?: number; lng?: number; accuracy?: number } = {};
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? undefined };
      }
      const result = await attendanceApi.checkIn(coords);
      setCheckedInAt(result.checkedInAt);
    } catch (e) {
      setCheckInError(extractApiError(e, 'Could not check in. Try again.'));
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) return <LoadingView label="Loading your day…" />;

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={{ gap: spacing.s5 }}>
        <View>
          <Text variant="caption" color="secondary">Welcome back</Text>
          <Text variant="title">{user?.firstName ?? 'Field Officer'}</Text>
        </View>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3 }}>
            <View style={{ flex: 1, gap: spacing.s1 }}>
              <Text variant="bodyMedium">Attendance</Text>
              <Text variant="caption" color="secondary">
                {checkedInAt ? `Checked in at ${formatTime(checkedInAt)}` : "You haven't checked in today"}
              </Text>
              {checkInError ? <Text variant="caption" color="error">{checkInError}</Text> : null}
            </View>
            {!checkedInAt ? (
              <Button label="Check in" onPress={onCheckIn} loading={checkingIn} fullWidth={false} icon={<MapPinCheck size={16} color="#fff" />} />
            ) : null}
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: spacing.s3 }}>
          <StatCard icon={IndianRupee} label="Collected today" value={collectionsToday != null ? formatCurrency(collectionsToday) : '—'} tone="success" />
          <StatCard icon={Handshake} label="PTPs due today" value={ptpsDueToday != null ? String(ptpsDueToday) : '—'} tone="warning" />
        </View>

        <View style={{ gap: spacing.s3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="headline">Today's visits</Text>
            <Text variant="caption" color="accent" onPress={() => router.push('/(tabs)/cases')}>View all cases</Text>
          </View>

          {todayCases.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No visits scheduled today" message="Cases assigned to you will show up here once dispatched." />
          ) : (
            todayCases.map((item) => <CaseRow key={item.id} item={item} />)
          )}
        </View>
      </View>
    </Screen>
  );
}
