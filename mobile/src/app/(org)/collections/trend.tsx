import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Animated, ActivityIndicator, Dimensions, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowUp, ArrowDown, Minus, RefreshCw, DollarSign, TrendingUp, Calendar, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, Card, Button, Badge } from '@/components/ui';
import { analyticsApi } from '@/api/analyticsApi';
import type { TrendPoint } from '@/types/domain';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop, G, Line, Text as SvgText } from 'react-native-svg';
import { formatCurrency } from '@/utils/allocationHeuristics';

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtINR(v: number) {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)}Cr`;
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(2)}L`;
  if (v >= 1_000)      return `₹${(v / 1_000).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
}

// ── Bezier smooth path ────────────────────────────────────────────────────

function smoothBezier(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cpx = (x0 + x1) / 2;
    d += ` C ${cpx.toFixed(1)},${y0.toFixed(1)} ${cpx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

// ── Micro-animated Skeleton ───────────────────────────────────────────────

const Skeleton = ({ width, height, style }: { width?: any; height: number; style?: any }) => {
  const { colors } = useTheme();
  const [opacity] = useState(new Animated.Value(0.3));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width || '100%',
          height,
          backgroundColor: colors.subtle,
          borderRadius: 6,
          opacity,
        },
        style,
      ]}
    />
  );
};

const ChartSkeleton = () => {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.s4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ gap: spacing.s1 }}>
          <Skeleton width={60} height={12} />
          <Skeleton width={120} height={28} />
          <Skeleton width={80} height={12} />
        </View>
        <Skeleton width={56} height={56} style={{ borderRadius: 28 }} />
        <View style={{ gap: spacing.s1, alignItems: 'flex-end' }}>
          <Skeleton width={60} height={12} />
          <Skeleton width={120} height={28} />
          <Skeleton width={80} height={12} />
        </View>
      </View>
      <Skeleton height={1} />
      <Skeleton height={200} />
    </View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function CollectionsTrendScreen() {
  const { colors, spacing, radius, isDark } = useTheme();
  const router = useRouter();

  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [range, setRange] = useState<3 | 6 | 12>(12);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const fetchTrendData = useCallback(async () => {
    try {
      setError(false);
      const data = await analyticsApi.getDashboard();
      setTrend(data?.collections?.monthlyTrend ?? []);
    } catch (err) {
      setError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchTrendData().finally(() => setLoading(false));
    }, [fetchTrendData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTrendData();
    setRefreshing(false);
  };

  // Sort chronologically (oldest → newest), then slice
  const sorted = useMemo(() => {
    return [...trend]
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .slice(-range);
  }, [trend, range]);

  const n = sorted.length;

  // Whenever range or sorted data changes, reset selected index to latest month
  useEffect(() => {
    if (n > 0) {
      setSelectedIdx(n - 1);
    } else {
      setSelectedIdx(null);
    }
  }, [n]);

  const thisMonth = selectedIdx !== null ? sorted[selectedIdx] : sorted[n - 1];
  const lastMonth = selectedIdx !== null && selectedIdx > 0 ? sorted[selectedIdx - 1] : sorted[n - 2];

  const thisAmt = thisMonth?.totalAmount ?? 0;
  const prevAmt = lastMonth?.totalAmount ?? 0;
  const diff = thisAmt - prevAmt;
  const pctChange = prevAmt > 0 ? (diff / prevAmt) * 100 : null;
  const isUp = diff > 0;
  const isFlat = diff === 0;

  // YTD (for the sorted range)
  const ytd = useMemo(() => sorted.reduce((s, p) => s + p.totalAmount, 0), [sorted]);

  // Best month in range
  const peakIdx = useMemo(() => {
    if (n === 0) return 0;
    return sorted.reduce((bi, p, i) => p.totalAmount > sorted[bi].totalAmount ? i : bi, 0);
  }, [sorted, n]);

  // Average MoM Growth Rate
  const avgGrowth = useMemo(() => {
    const diffs = sorted.slice(1).map((p, i) => {
      const prev = sorted[i].totalAmount;
      return prev > 0 ? ((p.totalAmount - prev) / prev) * 100 : 0;
    });
    return diffs.length ? diffs.reduce((s, d) => s + d, 0) / diffs.length : 0;
  }, [sorted]);

  // ── SVG Math ───────────────────────────────────────────────────────────────
  const W = 600;
  const H = 240;
  const padL = 30;
  const padR = 30;
  const padY = 25;

  const maxV = Math.max(...sorted.map(p => p.totalAmount), 1);
  const minV = Math.min(...sorted.map(p => p.totalAmount), 0); // floor to 0 or min value
  const range2 = maxV - minV || 1;

  const cx = useCallback((i: number) => {
    if (n <= 1) return W / 2;
    return padL + (i / (n - 1)) * (W - padL - padR);
  }, [n, padL, padR, W]);

  const cy = useCallback((v: number) => {
    return padY + (1 - (v - minV) / range2) * (H - padY * 2);
  }, [minV, range2, padY, H]);

  const coords: [number, number][] = useMemo(() => {
    return sorted.map((p, i) => [cx(i), cy(p.totalAmount)]);
  }, [sorted, cx, cy]);

  const linePath = useMemo(() => smoothBezier(coords), [coords]);

  const areaPath = useMemo(() => {
    if (n === 0) return '';
    return `M ${cx(0).toFixed(1)},${H} ` +
      sorted.map((p, i) => `L ${cx(i).toFixed(1)},${cy(p.totalAmount).toFixed(1)}`).join(' ') +
      ` L ${cx(n - 1).toFixed(1)},${H} Z`;
  }, [n, cx, cy, sorted]);

  // Txn count secondary line
  const maxTxn = Math.max(...sorted.map(p => p.totalCount), 1);
  const cyTxn = useCallback((v: number) => {
    return padY + (1 - v / maxTxn) * (H - padY * 2);
  }, [maxTxn, padY, H]);

  const txnPath = useMemo(() => {
    return smoothBezier(sorted.map((p, i) => [cx(i), cyTxn(p.totalCount)]));
  }, [sorted, cx, cyTxn]);

  const lineColor = isUp || isFlat ? colors.accent : colors.error;

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.s4, gap: spacing.s4 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Top controls and toggle */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={styles.toggleContainer}>
            {([3, 6, 12] as const).map((r) => (
              <Pressable
                key={r}
                onPress={() => setRange(r)}
                style={[
                  styles.toggleBtn,
                  { backgroundColor: range === r ? colors.accentSubtle : 'transparent', borderRadius: radius.sm }
                ]}
              >
                <Text
                  variant="bodyMedium"
                  style={{
                    color: range === r ? colors.accent : colors.ink2,
                    fontWeight: range === r ? '700' : '500'
                  }}
                >
                  {r}M
                </Text>
              </Pressable>
            ))}
          </View>

          <Button
            label="Refresh"
            icon={<RefreshCw size={16} color={colors.ink1} />}
            variant="outline"
            size="md"
            onPress={onRefresh}
            fullWidth={false}
          />
        </View>

        {/* Error State */}
        {error && (
          <Card style={[styles.errorCard, { borderColor: colors.error }]}>
            <AlertTriangle size={20} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" style={{ color: colors.error, fontWeight: '600' }}>
                Failed to load trend data
              </Text>
              <Text variant="caption" color="secondary">
                Please check your network and try again.
              </Text>
            </View>
            <Button label="Retry" onPress={onRefresh} size="md" variant="outline" fullWidth={false} />
          </Card>
        )}

        {/* Loading skeleton */}
        {loading && <ChartSkeleton />}

        {/* Empty / Single data point */}
        {!loading && !error && n <= 1 && (
          <Card style={{ padding: spacing.s5, alignItems: 'center', gap: spacing.s3 }}>
            <TrendingUp size={48} color={colors.ink3} />
            <Text variant="headline" style={{ textAlign: 'center' }}>Insufficient Data</Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
              At least two months of collection history are required to show growth trends.
            </Text>
          </Card>
        )}

        {/* Trend Content */}
        {!loading && !error && n >= 2 && (
          <Card style={{ padding: spacing.s4, gap: spacing.s4 }}>
            {/* MOM Comparison Row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* Selected month */}
              <View style={{ gap: spacing.s1 }}>
                <Text variant="eyebrow" color="secondary">
                  {thisMonth?.label?.toUpperCase()} (SELECTED)
                </Text>
                <Text
                  variant="title"
                  style={{
                    color: isUp || isFlat ? colors.success : colors.error,
                    fontFamily: 'System'
                  }}
                >
                  {fmtINR(thisAmt)}
                </Text>
                <Text variant="caption" color="secondary">
                  {thisMonth?.totalCount ?? 0} transactions
                </Text>
              </View>

              {/* Growth badge */}
              <View
                style={[
                  styles.badgeContainer,
                  {
                    backgroundColor: isUp ? colors.successSubtle : isFlat ? colors.subtle : colors.errorSubtle,
                    borderRadius: 28,
                  }
                ]}
              >
                {isFlat ? (
                  <Minus size={16} color={colors.ink2} />
                ) : isUp ? (
                  <ArrowUp size={16} color={colors.success} />
                ) : (
                  <ArrowDown size={16} color={colors.error} />
                )}
                <Text
                  variant="label"
                  style={{
                    color: isUp ? colors.success : isFlat ? colors.ink2 : colors.error,
                    fontWeight: '700'
                  }}
                >
                  {pctChange !== null ? `${Math.abs(pctChange).toFixed(0)}%` : '—'}
                </Text>
              </View>

              {/* Previous month */}
              <View style={{ alignItems: 'flex-end', gap: spacing.s1 }}>
                <Text variant="eyebrow" color="secondary">
                  {lastMonth ? lastMonth.label?.toUpperCase() : 'PREVIOUS'}
                </Text>
                <Text variant="headline" style={{ color: colors.ink2, fontWeight: '700' }}>
                  {lastMonth ? fmtINR(prevAmt) : '—'}
                </Text>
                <Text variant="caption" color="secondary">
                  {lastMonth ? `${lastMonth.totalCount} transactions` : '—'}
                </Text>
              </View>
            </View>

            {/* Divider with Trend label */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s3 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <Text variant="eyebrow" color="tertiary">TAP DOTS TO VIEW DETAIL</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>

            {/* Chart Area */}
            <View style={{ height: 230, width: '100%' }}>
              <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
                <Defs>
                  <LinearGradient id="cmom-fill" x1="0" y1="0" x2="0" y2="1">
                    <Stop
                      offset="0%"
                      stopColor={lineColor}
                      stopOpacity={0.16}
                    />
                    <Stop
                      offset="100%"
                      stopColor={lineColor}
                      stopOpacity={0.01}
                    />
                  </LinearGradient>
                </Defs>

                {/* Grid lines */}
                {[0, 0.5, 1].map((t, i) => {
                  const gy = padY + t * (H - padY * 2);
                  return (
                    <Line
                      key={i}
                      x1={padL}
                      y1={gy}
                      x2={W - padR}
                      y2={gy}
                      stroke={colors.border}
                      strokeWidth={1}
                      strokeDasharray="4,6"
                      opacity={0.7}
                    />
                  );
                })}

                {/* Area under curve */}
                <Path d={areaPath} fill="url(#cmom-fill)" />

                {/* Txn count secondary line */}
                <Path
                  d={txnPath}
                  fill="none"
                  stroke={colors.ink3}
                  strokeWidth={1.5}
                  strokeDasharray="4,4"
                  opacity={0.3}
                />

                {/* Main line */}
                <Path
                  d={linePath}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* Peak marker */}
                {peakIdx < n && (
                  <G>
                    <Circle
                      cx={cx(peakIdx)}
                      cy={cy(sorted[peakIdx].totalAmount)}
                      r={5}
                      fill={colors.accent}
                    />
                    <Rect
                      x={cx(peakIdx) - 25}
                      y={cy(sorted[peakIdx].totalAmount) - 28}
                      width={50}
                      height={18}
                      rx={4}
                      fill={colors.accent}
                    />
                    <SvgText
                      x={cx(peakIdx)}
                      y={cy(sorted[peakIdx].totalAmount) - 18}
                      textAnchor="middle"
                      fill={colors.white}
                      fontSize="9"
                      fontWeight="bold"
                    >
                      PEAK
                    </SvgText>
                  </G>
                )}

                {/* Data Points (Highlight selected) */}
                {sorted.map((p, i) => {
                  const isSelected = selectedIdx === i;
                  return (
                    <G key={i}>
                      {/* Interactive Point Dot */}
                      <Circle
                        cx={cx(i)}
                        cy={cy(p.totalAmount)}
                        r={isSelected ? 6 : 4}
                        fill={isSelected ? colors.white : lineColor}
                        stroke={lineColor}
                        strokeWidth={isSelected ? 3 : 1}
                      />

                      {/* Transparent Tap target overlay */}
                      <Circle
                        cx={cx(i)}
                        cy={cy(p.totalAmount)}
                        r={24}
                        fill="transparent"
                        onPress={() => setSelectedIdx(i)}
                      />
                    </G>
                  );
                })}
              </Svg>
            </View>

            {/* X Labels */}
            <View style={[styles.xLabelsContainer, { borderColor: colors.border }]}>
              {sorted.map((p, i) => {
                const isSelected = selectedIdx === i;
                return (
                  <Pressable
                    key={i}
                    onPress={() => setSelectedIdx(i)}
                    style={[
                      styles.labelBtn,
                      isSelected && { backgroundColor: colors.subtle, borderRadius: radius.sm }
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{
                        fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? colors.ink1 : colors.ink3
                      }}
                    >
                      {p.label?.slice(0, 3)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Bottom summary stats */}
            <View style={[styles.statsRow, { borderColor: colors.border }]}>
              <View style={{ gap: spacing.s1 }}>
                <Text variant="caption" color="secondary">YTD Total</Text>
                <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1 }}>
                  {fmtINR(ytd)}
                </Text>
              </View>

              <View style={{ gap: spacing.s1, alignItems: 'center' }}>
                <Text variant="caption" color="secondary">Avg Growth</Text>
                <Text
                  variant="bodyMedium"
                  style={{
                    fontWeight: '700',
                    color: avgGrowth >= 0 ? colors.success : colors.error
                  }}
                >
                  {avgGrowth >= 0 ? '+' : ''}{avgGrowth.toFixed(1)}%
                </Text>
              </View>

              <View style={{ gap: spacing.s1, alignItems: 'flex-end' }}>
                <Text variant="caption" color="secondary">Peak Month</Text>
                <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1 }}>
                  {sorted[peakIdx]?.label?.slice(0, 3)}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* View All Collections Button */}
        {!loading && !error && (
          <Button
            label="View Transaction History"
            onPress={() => router.push('/(org)/(tabs)/collections')}
            size="lg"
            variant="outline"
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
    borderWidth: 1,
    borderColor: '#EBEDF1',
    borderRadius: 8,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  badgeContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  labelBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 1,
  }
});
