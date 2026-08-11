import React, { useCallback, useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { WifiOff, TrendingUp } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, EmptyState, LoadingView, Card } from '@/components/ui';
import { platformApi, type RevenueTrendPoint } from '@/api/platformApi';

type Granularity = 'daily' | 'monthly' | 'yearly';
type Basis = 'contracted' | 'collected';

function fmtINR(v: number) {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000)      return `₹${(v / 1_000).toFixed(0)}K`;
  return `₹${Math.round(v)}`;
}

function toRupees(revenue: number, basis: Basis) {
  return basis === 'collected' ? revenue / 100 : revenue;
}

function BarChart({
  data, basis, accentColor, gridColor, labelColor, bgColor,
}: {
  data: RevenueTrendPoint[];
  basis: Basis;
  accentColor: string;
  gridColor: string;
  labelColor: string;
  bgColor: string;
}) {
  const { width: screenW } = useWindowDimensions();
  const padH = 16;
  const padT = 12;
  const padB = 40;
  const chartW = Math.max(screenW - 32, data.length * 36);
  const chartH = 200;
  const innerH = chartH - padT - padB;

  const values = data.map((p) => toRupees(p.revenue, basis));
  const maxVal = Math.max(...values, 1);
  const barW = Math.max(16, (chartW - padH * 2) / data.length - 6);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={chartW} height={chartH}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padT + innerH * (1 - frac);
          return (
            <G key={frac}>
              <Line x1={padH} y1={y} x2={chartW - padH} y2={y} stroke={gridColor} strokeWidth={1} />
              <SvgText x={padH} y={y - 3} fontSize={9} fill={labelColor} textAnchor="start">
                {frac > 0 ? fmtINR(maxVal * frac) : ''}
              </SvgText>
            </G>
          );
        })}
        {/* Bars */}
        {data.map((point, i) => {
          const val = values[i];
          const barH = Math.max(2, (val / maxVal) * innerH);
          const x = padH + i * ((chartW - padH * 2) / data.length) + 3;
          const y = padT + innerH - barH;
          return (
            <G key={point.month}>
              <Rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                fill={accentColor}
                rx={3}
                opacity={0.85}
              />
              <SvgText
                x={x + barW / 2}
                y={chartH - 4}
                fontSize={9}
                fill={labelColor}
                textAnchor="middle"
              >
                {point.month.slice(0, 3)}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </ScrollView>
  );
}

export default function RevenueTrendScreen() {
  const { colors, spacing } = useTheme();
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [basis, setBasis] = useState<Basis>('contracted');
  const [data, setData] = useState<RevenueTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      const periods = granularity === 'daily' ? 30 : granularity === 'monthly' ? 6 : 0;
      const rows = await platformApi.getRevenueTrend(granularity, periods, basis);
      setData(rows);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [granularity, basis]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const values = data.map((p) => toRupees(p.revenue, basis));
  const totalRevenue = values.reduce((s, v) => s + v, 0);
  const avgRevenue = data.length > 0 ? totalRevenue / data.length : 0;

  const GRANULARITIES: { key: Granularity; label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'yearly', label: 'Yearly' },
  ];

  const BASES: { key: Basis; label: string }[] = [
    { key: 'contracted', label: 'Billed' },
    { key: 'collected', label: 'Received' },
  ];

  if (loading) return <LoadingView label="Loading revenue trend…" />;

  if (loadError) {
    return (
      <Screen>
        <EmptyState
          icon={WifiOff}
          title="Revenue data unavailable"
          message="Could not load revenue trend. Check your connection."
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ gap: spacing.s4, paddingBottom: spacing.s4 }}>
        <View>
          <Text variant="title">Revenue Trend</Text>
          <Text variant="caption" color="secondary">SaaS-wide contracted vs received revenue</Text>
        </View>

        {/* Basis toggle */}
        <View style={[styles.toggleRow, { borderColor: colors.border }]}>
          {BASES.map((b) => {
            const active = basis === b.key;
            return (
              <TouchableOpacity
                key={b.key}
                style={[styles.toggleBtn, { backgroundColor: active ? colors.accent : 'transparent' }]}
                onPress={() => setBasis(b.key)}
                activeOpacity={0.7}
              >
                <Text variant="caption" style={{ fontWeight: '600', color: active ? colors.canvas : colors.ink2 }}>
                  {b.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Granularity toggle */}
        <View style={[styles.toggleRow, { borderColor: colors.border }]}>
          {GRANULARITIES.map((g) => {
            const active = granularity === g.key;
            return (
              <TouchableOpacity
                key={g.key}
                style={[styles.toggleBtn, { backgroundColor: active ? colors.accentSubtle : 'transparent' }]}
                onPress={() => setGranularity(g.key)}
                activeOpacity={0.7}
              >
                <Text variant="caption" style={{ fontWeight: '600', color: active ? colors.accent : colors.ink2 }}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Summary stats */}
        <View style={{ flexDirection: 'row', gap: spacing.s3 }}>
          <Card style={{ flex: 1, padding: spacing.s3, alignItems: 'center' }}>
            <Text variant="caption" color="secondary">Total</Text>
            <Text variant="headline" style={{ color: colors.accent, fontWeight: '700' }}>
              {fmtINR(totalRevenue)}
            </Text>
          </Card>
          <Card style={{ flex: 1, padding: spacing.s3, alignItems: 'center' }}>
            <Text variant="caption" color="secondary">Average / period</Text>
            <Text variant="headline" style={{ color: colors.ink1, fontWeight: '700' }}>
              {fmtINR(avgRevenue)}
            </Text>
          </Card>
        </View>

        {/* Chart */}
        <Card style={{ padding: spacing.s3 }}>
          <Text variant="label" style={{ fontWeight: '600', marginBottom: spacing.s2, color: colors.ink1 }}>
            {basis === 'contracted' ? 'Billed revenue' : 'Received revenue'} · {granularity}
          </Text>
          {data.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No revenue data"
              message="No data available for the selected period."
            />
          ) : (
            <BarChart
              data={data}
              basis={basis}
              accentColor={colors.accent}
              gridColor={colors.border}
              labelColor={colors.ink3}
              bgColor={colors.surface}
            />
          )}
        </Card>

        {/* Data table */}
        {data.length > 0 && (
          <Card style={{ padding: spacing.s3 }}>
            <Text variant="label" style={{ fontWeight: '600', marginBottom: spacing.s2, color: colors.ink1 }}>
              Period breakdown
            </Text>
            {data.map((point, i) => (
              <View
                key={point.month}
                style={[
                  styles.tableRow,
                  { borderBottomColor: colors.border, borderBottomWidth: i < data.length - 1 ? 1 : 0 },
                ]}
              >
                <Text variant="caption" color="secondary">{point.month}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="label" style={{ color: colors.ink1 }}>
                    {fmtINR(toRupees(point.revenue, basis))}
                  </Text>
                  <Text variant="caption" color="secondary">{point.count} org{point.count !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
});
