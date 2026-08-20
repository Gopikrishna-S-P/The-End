import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Briefcase, ChevronLeft, Search, WifiOff, X } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/useTheme';
import { Text, EmptyState, LoadingView } from '@/components/ui';
import { CaseRow } from '@/components/CaseRow';
import { allocationsApi } from '@/api/allocationsApi';
import { resolveDPD } from '@/utils/allocationHeuristics';
import type { AllocationResponse } from '@/types/domain';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

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

      const timer = setInterval(() => {
        load();
      }, 60000);

      return () => clearInterval(timer);
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
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <LinearGradient colors={['#E6F6E2', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 250 }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.s4, paddingTop: spacing.s4, gap: spacing.s4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3 }}>
            <Pressable onPress={() => router.replace('/(org)/(tabs)')} hitSlop={8}>
              <ChevronLeft size={22} color="#374151" />
            </Pressable>
            <Text style={{ fontSize: 13, color: '#000000', fontFamily: 'Inter_500Medium' }}>Cases</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(org)/(tabs)/loans')}
            style={{ backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#0AA550' }}
          >
            <Text style={{ fontSize: 12, color: '#0AA550', fontFamily: 'Inter_500Medium' }}>All Cases</Text>
          </Pressable>
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
    </View>
  );
}
