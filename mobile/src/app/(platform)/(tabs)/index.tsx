import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { WifiOff, Building, Users, Database, Upload, LogOut } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, EmptyState, LoadingView, Card, Button } from '@/components/ui';
import { platformApi, type PlatformStats } from '@/api/platformApi';
import { useAuth } from '@/context/AuthContext';

export default function PlatformOverviewScreen() {
  const { colors, spacing } = useTheme();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logout();
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const load = useCallback(async () => {
    try {
      const response = await platformApi.getStats();
      setStats(response);
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

  if (loading) return <LoadingView label="Loading platform statistics..." />;

  if (loadError || !stats) {
    return (
      <Screen>
        <EmptyState
          icon={WifiOff}
          title="Overview unavailable"
          message="Failed to load platform dashboard. Pull down to try again."
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ gap: spacing.s4, paddingBottom: spacing.s4 }}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="title">Platform Overview</Text>
            <Text variant="caption" color="secondary">SaaS-wide parameters and growth metrics</Text>
            {user?.email ? (
              <Text variant="caption" style={{ color: colors.ink3, marginTop: 2 }}>
                {user.email}
              </Text>
            ) : null}
          </View>
          <Button
            label="Sign Out"
            variant="danger"
            size="md"
            fullWidth={false}
            loading={loggingOut}
            icon={<LogOut size={15} color="#fff" />}
            onPress={handleLogout}
          />
        </View>

        <Card style={{ padding: spacing.s4, gap: spacing.s3 }}>
          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Building size={18} color={colors.accent} />
              <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Active Orgs:</Text>
            </View>
            <Text variant="body" color="primary" style={{ fontWeight: '700' }}>
              {stats.activeOrgs} / {stats.totalOrgs}
            </Text>
          </View>

          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Users size={18} color={colors.accent} />
              <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Platform Users:</Text>
            </View>
            <Text variant="body" color="primary">{stats.totalUsers}</Text>
          </View>

          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Database size={18} color={colors.accent} />
              <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Allocated Cases:</Text>
            </View>
            <Text variant="body" color="primary">{stats.totalAllocations}</Text>
          </View>

          <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Upload size={18} color={colors.accent} />
              <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Uploaded Ingestions:</Text>
            </View>
            <Text variant="body" color="primary">{stats.totalUploads}</Text>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
  },
});
