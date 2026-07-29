import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Briefcase, Search, WifiOff, X } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/useTheme';
import { Text, EmptyState, LoadingView } from '@/components/ui';
import { CaseRow } from '@/components/CaseRow';
import { allocationsApi } from '@/api/allocationsApi';
import { resolveDPD } from '@/utils/allocationHeuristics';
import type { AllocationResponse } from '@/types/domain';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MyCasesScreen() {
  const { user } = useAuth();
  const { colors, spacing, radius } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cases, setCases] = useState<AllocationResponse[]>([]);
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const paged = await allocationsApi.getMyCases(user.id, { size: 200 });
      setCases(paged.content);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? cases.filter((c) => c.borrowerName?.toLowerCase().includes(q) || c.loanNumber?.toLowerCase().includes(q))
      : cases;
    return [...base].sort((a, b) => (resolveDPD(b) ?? -1) - (resolveDPD(a) ?? -1));
  }, [cases, search]);

  if (loading) return <LoadingView label="Loading your cases…" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.s4, paddingTop: spacing.s4, gap: spacing.s4 }}>
        <View>
          <Text variant="title">My Cases</Text>
          <Text variant="caption" color="secondary">{cases.length} total assigned cases</Text>
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
            placeholder="Search borrower or loan number"
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
        contentContainerStyle={{ padding: spacing.s4, paddingBottom: spacing.s8 }}
        renderItem={({ item }) => <CaseRow item={item} />}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          loadError
            ? <EmptyState icon={WifiOff} title="Couldn't load cases" message="Pull down to try again." />
            : (
              <EmptyState
                icon={Briefcase}
                title="No cases found"
                message={search ? 'Try adjusting your search.' : 'No cases are currently assigned to you.'}
              />
            )
        }
      />
    </SafeAreaView>
  );
}
