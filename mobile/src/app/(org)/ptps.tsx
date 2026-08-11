import React, { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet, Modal, Pressable, ScrollView, SafeAreaView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { TrendingUp, WifiOff, X, AlertTriangle, Clock, Calendar, User, FileText, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, Card, Badge, EmptyState, LoadingView, Divider, Button } from '@/components/ui';
import { ptpsApi } from '@/api/ptpsApi';
import { formatCurrency } from '@/utils/allocationHeuristics';
import { formatDate, formatDateTime } from '@/utils/date';
import type { PtpResponse } from '@/types/domain';

export default function PtpListScreen() {
  const { user } = useAuth();
  const { colors, spacing, radius } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ptps, setPtps] = useState<PtpResponse[]>([]);
  const [loadError, setLoadError] = useState(false);
  
  const [selectedPtp, setSelectedPtp] = useState<PtpResponse | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const response = await ptpsApi.list({ size: 100 });
      setPtps(response.content ?? []);
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

  const getPtpBadgeTone = (status: string) => {
    switch (status) {
      case 'FULFILLED': return 'success';
      case 'PARTIALLY_FULFILLED': return 'info';
      case 'BROKEN': return 'error';
      case 'CANCELLED': return 'neutral';
      case 'PENDING':
      default: return 'warning';
    }
  };

  if (loading) return <LoadingView label="Loading Promises to Pay…" />;

  return (
    <Screen edges={['top']}>
      <View style={{ gap: spacing.s4, paddingBottom: spacing.s4 }}>
        <View>
          <Text variant="title">Promises to Pay</Text>
          <Text variant="caption" color="secondary">{ptps.length} active promises recorded</Text>
        </View>

        <FlatList
          data={ptps}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.s3 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => setSelectedPtp(item)}>
              <Card style={{ padding: spacing.s4, gap: spacing.s2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1, flex: 1 }}>
                    {item.borrowerName || 'Unknown Borrower'}
                  </Text>
                  <Badge tone={getPtpBadgeTone(item.status)} label={item.status.replace('_', ' ')} />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" color="secondary">Loan: {item.loanNumber}</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: '600', color: colors.accent }}>
                    {formatCurrency(item.promisedAmount)}
                  </Text>
                </View>

                <Divider style={{ marginVertical: 4 }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" color="secondary">Promised: {formatDate(item.promisedDate)}</Text>
                  <Text variant="caption" color="tertiary">Logged by: {item.agentName}</Text>
                </View>
              </Card>
            </Pressable>
          )}
          refreshing={refreshing}
          onRefresh={onRefresh}
          scrollEnabled={false}
          ListEmptyComponent={
            loadError ? (
              <EmptyState icon={WifiOff} title="Couldn't load PTPs" message="Pull down to try again." />
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="No PTPs found"
                message="Promises to Pay logged by the team will be listed here."
              />
            )
          }
        />
      </View>

      {/* PTP Details Modal */}
      <Modal visible={!!selectedPtp} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.canvas, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '90%', flex: 1 }}>
            
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: spacing.s4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ flex: 1 }}>
                <Text variant="title">{selectedPtp?.borrowerName}</Text>
                <Text variant="caption" color="secondary" style={{ marginTop: 2 }}>Loan #{selectedPtp?.loanNumber}</Text>
                <Text variant="caption" color="tertiary" style={{ marginTop: 2 }}>{selectedPtp?.agentName} · {formatDate(selectedPtp?.createdAt || '')}</Text>
              </View>
              <Pressable onPress={() => setSelectedPtp(null)} style={{ padding: 4 }}>
                <X size={20} color={colors.ink2} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing.s4, gap: spacing.s6 }}>
              
              {/* Pills */}
              <View style={{ flexDirection: 'row', gap: spacing.s2, flexWrap: 'wrap' }}>
                <Badge tone={getPtpBadgeTone(selectedPtp?.status || '')} label={(selectedPtp?.status || '').replace('_', ' ')} />
                {selectedPtp?.status === 'PENDING' && new Date(selectedPtp.promisedDate) < new Date() && (
                  <Badge tone="error" label="Overdue" />
                )}
                {selectedPtp?.reminderSent && (
                  <Badge tone="neutral" label="Reminder sent" />
                )}
              </View>

              {/* Stat Grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s4 }}>
                <View style={{ flexBasis: '45%' }}>
                  <Text variant="caption" color="secondary">Promised</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{formatCurrency(selectedPtp?.promisedAmount || 0)}</Text>
                </View>
                <View style={{ flexBasis: '45%' }}>
                  <Text variant="caption" color="secondary">Collected</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: '600', color: (selectedPtp?.collectedAmount || 0) > 0 ? colors.accent : colors.ink1 }}>{formatCurrency(selectedPtp?.collectedAmount || 0)}</Text>
                </View>
                <View style={{ flexBasis: '45%' }}>
                  <Text variant="caption" color="secondary">Promised date</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: '600', color: (selectedPtp?.status === 'PENDING' && new Date(selectedPtp.promisedDate) < new Date()) ? colors.error : colors.ink1 }}>{formatDate(selectedPtp?.promisedDate || '')}</Text>
                </View>
                <View style={{ flexBasis: '45%' }}>
                  <Text variant="caption" color="secondary">Fulfillment</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{selectedPtp?.fulfillmentPercentage?.toFixed(0) || '0'}%</Text>
                </View>
              </View>

              {/* Loan Info */}
              <View style={{ gap: spacing.s2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <FileText size={14} color={colors.ink2} />
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Loan information</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" color="secondary">Borrower</Text>
                  <Text variant="caption" style={{ fontWeight: '500' }}>{selectedPtp?.borrowerName}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" color="secondary">Loan number</Text>
                  <Text variant="caption" style={{ fontWeight: '500' }}>{selectedPtp?.loanNumber}</Text>
                </View>
              </View>

              {/* Agent */}
              <View style={{ gap: spacing.s2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <User size={14} color={colors.ink2} />
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Agent</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" color="secondary">Name</Text>
                  <Text variant="caption" style={{ fontWeight: '500' }}>{selectedPtp?.agentName}</Text>
                </View>
              </View>

              {/* Promise details */}
              <View style={{ gap: spacing.s2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <FileText size={14} color={colors.ink2} />
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Promise details</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" color="secondary">Promised amount</Text>
                  <Text variant="caption" style={{ fontWeight: '600' }}>{formatCurrency(selectedPtp?.promisedAmount || 0)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" color="secondary">Promised date</Text>
                  <Text variant="caption" style={{ fontWeight: '500' }}>{formatDate(selectedPtp?.promisedDate || '')}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" color="secondary">Amount collected</Text>
                  <Text variant="caption" style={{ fontWeight: '600', color: (selectedPtp?.collectedAmount || 0) > 0 ? colors.accent : colors.ink1 }}>{formatCurrency(selectedPtp?.collectedAmount || 0)}</Text>
                </View>
                {selectedPtp?.contactNotes && (
                  <View style={{ gap: 4, marginTop: 4 }}>
                    <Text variant="caption" color="secondary">Contact notes</Text>
                    <Text variant="caption" style={{ fontWeight: '400' }}>{selectedPtp?.contactNotes}</Text>
                  </View>
                )}
              </View>

              {/* Reasons */}
              {(selectedPtp?.brokenReason || selectedPtp?.cancellationReason) && (
                <View style={{ gap: spacing.s2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <AlertTriangle size={14} color={colors.error} />
                    <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Reason</Text>
                  </View>
                  {selectedPtp?.brokenReason && (
                    <View style={{ gap: 4 }}>
                      <Text variant="caption" color="secondary">Broken reason</Text>
                      <Text variant="caption" style={{ color: colors.error }}>{selectedPtp.brokenReason}</Text>
                    </View>
                  )}
                  {selectedPtp?.cancellationReason && (
                    <View style={{ gap: 4 }}>
                      <Text variant="caption" color="secondary">Cancellation reason</Text>
                      <Text variant="caption" style={{ fontWeight: '400' }}>{selectedPtp.cancellationReason}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Timeline */}
              <View style={{ gap: spacing.s2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Calendar size={14} color={colors.ink2} />
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Timeline</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" color="secondary">Created</Text>
                  <Text variant="caption" style={{ fontWeight: '500' }}>{formatDateTime(selectedPtp?.createdAt || '')}</Text>
                </View>
                {selectedPtp?.fulfilledAt && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="caption" color="secondary">Fulfilled at</Text>
                    <Text variant="caption" style={{ fontWeight: '500' }}>{formatDateTime(selectedPtp.fulfilledAt)}</Text>
                  </View>
                )}
                {selectedPtp?.brokenAt && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="caption" color="secondary">Broken at</Text>
                    <Text variant="caption" style={{ fontWeight: '500' }}>{formatDateTime(selectedPtp.brokenAt)}</Text>
                  </View>
                )}
                {selectedPtp?.reminderSentAt && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="caption" color="secondary">Reminder sent</Text>
                    <Text variant="caption" style={{ fontWeight: '500' }}>{formatDateTime(selectedPtp.reminderSentAt)}</Text>
                  </View>
                )}
              </View>

            </ScrollView>
            
            <View style={{ padding: spacing.s4, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Button label="Done" onPress={() => setSelectedPtp(null)} />
            </View>
            <SafeAreaView />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
