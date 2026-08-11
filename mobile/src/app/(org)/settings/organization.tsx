import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { WifiOff, Building, Save, Lock } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, EmptyState, LoadingView, Card, Badge, Button, TextField } from '@/components/ui';
import { organizationsApi, type OrganizationSummary } from '@/api/organizationsApi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/utils/date';

export default function OrganizationSettingsScreen() {
  const { colors, spacing, radius } = useTheme();
  const { role } = useAuth();
  const { showToast } = useToast();

  const canEdit =
    role === 'ORG_ADMIN' || role === 'PLATFORM_ADMIN' ||
    role === 'AGENCY_ADMIN' || role === 'BANK_ADMIN';

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<OrganizationSummary | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await organizationsApi.getMyOrganization();
      setOrg(response);
      setName(response.name);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const save = async () => {
    if (!name.trim() || name.trim() === org?.name) return;
    setSaving(true);
    try {
      const updated = await organizationsApi.updateMyOrganization({ name: name.trim() });
      setOrg(updated);
      setName(updated.name);
      showToast('Organization updated successfully', { type: 'success' });
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Failed to update organization', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const isDirty = name.trim() !== (org?.name ?? '');

  if (loading) return <LoadingView label="Loading organization profile..." />;

  if (loadError || !org) {
    return (
      <Screen>
        <EmptyState
          icon={WifiOff}
          title="Profile unavailable"
          message="Failed to load organization settings. Pull down to try again."
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ gap: spacing.s4, paddingBottom: spacing.s4 }}>

        {/* Header */}
        <View>
          <Text variant="title">Organization Settings</Text>
          <Text variant="caption" color="secondary">Configure profile context parameters</Text>
        </View>

        {/* Main card */}
        <Card style={{ padding: spacing.s4, gap: spacing.s4 }}>

          {/* Org name + status badge */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s2 }}>
              <Building size={16} color={colors.ink2} />
              <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1 }}>
                Organization Profile
              </Text>
            </View>
            <Badge tone={org.isActive ? 'success' : 'neutral'} label={org.isActive ? 'Active' : 'Inactive'} />
          </View>

          {/* Editable name field */}
          <View style={{ gap: spacing.s1 + 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s2 }}>
              <Text variant="label" color="secondary">Name</Text>
              {!canEdit ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 3,
                  backgroundColor: colors.subtle, borderRadius: radius.pill,
                  paddingHorizontal: 6, paddingVertical: 2,
                }}>
                  <Lock size={9} color={colors.ink3} />
                  <Text style={{ fontSize: 9, color: colors.ink3, fontFamily: 'Inter_600SemiBold' }}>
                    READ-ONLY
                  </Text>
                </View>
              ) : null}
            </View>
            <TextField
              value={name}
              onChangeText={setName}
              editable={canEdit}
              placeholder="Organization name"
              style={{ opacity: canEdit ? 1 : 0.6 }}
            />
          </View>

          {/* Info grid */}
          <View style={{
            backgroundColor: colors.subtle, borderRadius: radius.md,
            borderWidth: 1, borderColor: colors.border,
            padding: spacing.s3, gap: 0,
          }}>
            <View style={styles.row}>
              <Text variant="caption" color="secondary">Organization Code</Text>
              <Text variant="body" style={{ fontWeight: '700', fontFamily: 'monospace', color: colors.ink1 }}>
                {org.code}
              </Text>
            </View>

            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text variant="caption" color="secondary">Admin Email</Text>
              <Text variant="body" color="primary">{org.orgAdminEmail || '—'}</Text>
            </View>

            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text variant="caption" color="secondary">Total Accounts</Text>
              <Text variant="body" style={{ fontWeight: '600', color: colors.ink1 }}>{org.userCount}</Text>
            </View>

            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text variant="caption" color="secondary">Created At</Text>
              <Text variant="body" color="primary">{formatDate(org.createdAt)}</Text>
            </View>
          </View>

          {/* Save changes button */}
          {canEdit ? (
            <View style={{
              paddingTop: spacing.s3,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}>
              <Button
                label={saving ? 'Saving…' : 'Save changes'}
                variant="primary"
                onPress={save}
                disabled={saving || !isDirty}
                style={{ alignSelf: 'flex-end' }}
              />
            </View>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
});
