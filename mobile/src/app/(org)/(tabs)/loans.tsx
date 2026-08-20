import React, { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet, TextInput, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Search, WifiOff, X, Layers, ChevronLeft } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, EmptyState, LoadingView, Card } from '@/components/ui';
import { CaseRow } from '@/components/CaseRow';
import { allocationsApi } from '@/api/allocationsApi';
import type { AllocationResponse } from '@/types/domain';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoansScreen() {
  const { user } = useAuth();
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loans, setLoans] = useState<AllocationResponse[]>([]);
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const response = await allocationsApi.listAllocations({ size: 100 });
      setLoans(response.content ?? []);
      setLoadError(false);
    } catch (e) {
      setLoadError(true);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));

      const timer = setInterval(() => {
        load();
      }, 60000);

      return () => clearInterval(timer);
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = loans.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.borrowerName?.toLowerCase().includes(q) || c.loanNumber?.toLowerCase().includes(q);
  });

  if (loading) return <LoadingView label="Loading loans…" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <LinearGradient colors={['#E6F6E2', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 250 }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.s4, paddingTop: spacing.s2, gap: spacing.s4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s2 }}>
          <Pressable onPress={() => router.replace('/(org)/(tabs)/cases')} hitSlop={8} style={{ padding: 4 }}>
            <ChevronLeft size={22} color={colors.ink1} />
          </Pressable>
          <Text style={{ fontSize: 13, fontWeight: '400', color: colors.ink3, fontFamily: 'Inter_400Regular' }}>Loans & allocations</Text>
        </View>

        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: spacing.s2,
          backgroundColor: colors.subtle, borderRadius: radius.md, paddingHorizontal: spacing.s3,
          borderWidth: 1, borderColor: colors.border, marginBottom: spacing.s2
        }}
        >
          <Search size={16} color={colors.ink3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search borrower or loan ID…"
            placeholderTextColor={colors.ink3}
            style={{ flex: 1, paddingVertical: spacing.s3, color: colors.ink1, fontFamily: 'Inter_400Regular', fontSize: 15 }}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <X size={16} color={colors.ink3} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.s4, paddingBottom: spacing.s8, gap: spacing.s2 }}
        renderItem={({ item }) => <CaseRow item={item} />}
        refreshing={refreshing}
        onRefresh={onRefresh}
          ListEmptyComponent={
            loadError ? (
              <EmptyState icon={WifiOff} title="Couldn't load loans" message="Pull down to try again." />
            ) : (
              <EmptyState
                icon={Layers}
                title="No loans found"
                message={search ? 'Try adjusting your search.' : 'No loans are currently registered.'}
              />
            )
          }
        />
    </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({});

