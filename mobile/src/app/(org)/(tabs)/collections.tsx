import React, { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet, TouchableOpacity, Share, Modal, Pressable, ScrollView, SafeAreaView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { DollarSign, WifiOff, X, Banknote, FileText, CreditCard, Calendar, User, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, Card, Badge, EmptyState, LoadingView, Divider, Button } from '@/components/ui';
import { collectionsApi } from '@/api/collectionsApi';
import { formatCurrency } from '@/utils/allocationHeuristics';
import { formatDate, formatDateTime } from '@/utils/date';
import { useToast } from '@/context/ToastContext';
import type { CollectionResponse } from '@/types/domain';

export default function CollectionsHubScreen() {
  const { user } = useAuth();
  const { colors, spacing, radius } = useTheme();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collections, setCollections] = useState<CollectionResponse[]>([]);
  const [loadError, setLoadError] = useState(false);
  
  const [selectedCol, setSelectedCol] = useState<CollectionResponse | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const response = await collectionsApi.list({ size: 100 });
      setCollections(response.content ?? []);
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

  const filterAndShareCSV = async (type: 'ALL' | 'TODAY' | 'MONTH' | 'YEAR') => {
    const d = new Date();
    // Use local date string to match basic logic
    const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const monthStartStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
    const yearStartStr = `${d.getFullYear()}-01-01`;

    let filtered = collections;
    if (type === 'TODAY') filtered = collections.filter(c => c.collectionDate >= todayStr);
    else if (type === 'MONTH') filtered = collections.filter(c => c.collectionDate >= monthStartStr);
    else if (type === 'YEAR') filtered = collections.filter(c => c.collectionDate >= yearStartStr);

    try {
      const header = 'ID,Amount,Status,Date,Mode\n';
      const rows = filtered
        .map((c) => `${c.id},${c.amount},${c.status},${c.collectionDate},${c.paymentMode}`)
        .join('\n');
      await Share.share({
        message: header + rows,
        title: 'Export Collections',
      });
    } catch (err) {
      showToast('Failed to export collections', { type: 'error' });
    }
  };

  const getStatusTone = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'DEPOSITED':
        return 'success';
      case 'REJECTED':
      case 'CANCELLED':
        return 'error';
      case 'PENDING_APPROVAL':
      default:
        return 'warning';
    }
  };

  if (loading) return <LoadingView label="Loading collections…" />;

  return (
    <Screen edges={['top']}>
      <View style={{ gap: spacing.s4, paddingBottom: spacing.s4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text variant="title">Collections</Text>
            <Text variant="caption" color="secondary">{collections.length} transaction records</Text>
          </View>
          <Button label="Export" onPress={() => setShowExportModal(true)} variant="outline" fullWidth={false} size="md" />
        </View>

        <FlatList
          data={collections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.s3 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => setSelectedCol(item)}>
              <Card style={{ padding: spacing.s4, gap: spacing.s2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1, flex: 1 }}>
                    Collection #{item.id.slice(-6).toUpperCase()}
                  </Text>
                  <Badge tone={getStatusTone(item.status)} label={item.status.replace('_', ' ')} />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="caption" color="secondary">Mode: {item.paymentMode.replace('_', ' ')}</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: '600', color: colors.accent }}>
                    {formatCurrency(item.amount)}
                  </Text>
                </View>

                <Divider style={{ marginVertical: 4 }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="caption" color="secondary">{formatDate(item.collectionDate)}</Text>
                  <Text variant="caption" color="tertiary">Agent: {item.submittedBy.slice(-6).toUpperCase()}</Text>
                </View>
              </Card>
            </Pressable>
          )}
          refreshing={refreshing}
          onRefresh={onRefresh}
          scrollEnabled={false}
          ListEmptyComponent={
            loadError ? (
              <EmptyState icon={WifiOff} title="Couldn't load collections" message="Pull down to try again." />
            ) : (
              <EmptyState
                icon={DollarSign}
                title="No collections recorded"
                message="Payments submitted by field agents will appear here."
              />
            )
          }
        />
      </View>

      {/* Collection Details Modal */}
      <Modal visible={!!selectedCol} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.canvas, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '90%', flex: 1 }}>
            
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: spacing.s4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ flex: 1 }}>
                <Text variant="title" style={{ fontSize: 24, letterSpacing: -0.5 }}>{formatCurrency(selectedCol?.amount || 0)}</Text>
                <Text variant="caption" color="secondary" style={{ marginTop: 2 }}>{selectedCol?.paymentMode.replace('_', ' ')} · {formatDate(selectedCol?.collectionDate || '')}</Text>
              </View>
              <Pressable onPress={() => setSelectedCol(null)} style={{ padding: 4 }}>
                <X size={20} color={colors.ink2} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing.s4, gap: spacing.s6 }}>
              
              {/* Pills */}
              <View style={{ flexDirection: 'row', gap: spacing.s2, flexWrap: 'wrap' }}>
                <Badge tone={getStatusTone(selectedCol?.status || '')} label={(selectedCol?.status || '').replace('_', ' ')} />
                <Badge tone="neutral" label={(selectedCol?.paymentMode || '').replace('_', ' ')} />
              </View>

              {/* Collection details */}
              <View style={{ gap: spacing.s2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Banknote size={14} color={colors.ink2} />
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Collection details</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" color="secondary">Amount</Text>
                  <Text variant="caption" style={{ fontWeight: '600', color: colors.success }}>{formatCurrency(selectedCol?.amount || 0)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" color="secondary">Collection date</Text>
                  <Text variant="caption" style={{ fontWeight: '500' }}>{formatDate(selectedCol?.collectionDate || '')}</Text>
                </View>
                {selectedCol?.receiptNumber && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="caption" color="secondary">Receipt</Text>
                    <Text variant="caption" style={{ fontWeight: '500' }}>{selectedCol.receiptNumber}</Text>
                  </View>
                )}
                {selectedCol?.notes && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="caption" color="secondary">Notes</Text>
                    <Text variant="caption" style={{ fontWeight: '400' }}>{selectedCol.notes}</Text>
                  </View>
                )}
                {selectedCol?.rejectionReason && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="caption" color="secondary">Rejection reason</Text>
                    <Text variant="caption" style={{ fontWeight: '500', color: colors.error }}>{selectedCol.rejectionReason}</Text>
                  </View>
                )}
              </View>

              {/* Cheque details */}
              {(selectedCol?.chequeNumber || selectedCol?.chequeDate || selectedCol?.bankName) && (
                <View style={{ gap: spacing.s2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <CreditCard size={14} color={colors.ink2} />
                    <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Cheque details</Text>
                  </View>
                  {selectedCol?.chequeNumber && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="caption" color="secondary">Cheque number</Text>
                      <Text variant="caption" style={{ fontWeight: '500' }}>{selectedCol.chequeNumber}</Text>
                    </View>
                  )}
                  {selectedCol?.chequeDate && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="caption" color="secondary">Cheque date</Text>
                      <Text variant="caption" style={{ fontWeight: '500' }}>{formatDate(selectedCol.chequeDate)}</Text>
                    </View>
                  )}
                  {selectedCol?.bankName && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="caption" color="secondary">Bank</Text>
                      <Text variant="caption" style={{ fontWeight: '500' }}>{selectedCol.bankName}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Transaction reference */}
              {(selectedCol?.upiReferenceId || selectedCol?.transactionReferenceId) && (
                <View style={{ gap: spacing.s2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <CreditCard size={14} color={colors.ink2} />
                    <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Transaction reference</Text>
                  </View>
                  {selectedCol?.upiReferenceId && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="caption" color="secondary">UPI reference</Text>
                      <Text variant="caption" style={{ fontWeight: '500' }}>{selectedCol.upiReferenceId}</Text>
                    </View>
                  )}
                  {selectedCol?.transactionReferenceId && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="caption" color="secondary">Transaction ID</Text>
                      <Text variant="caption" style={{ fontWeight: '500' }}>{selectedCol.transactionReferenceId}</Text>
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
                  <Text variant="caption" color="secondary">Submitted</Text>
                  <Text variant="caption" style={{ fontWeight: '500' }}>{formatDateTime(selectedCol?.createdAt || '')}</Text>
                </View>
                {selectedCol?.approvedAt && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="caption" color="secondary">Approved at</Text>
                    <Text variant="caption" style={{ fontWeight: '500' }}>{formatDateTime(selectedCol.approvedAt)}</Text>
                  </View>
                )}
                {selectedCol?.depositedAt && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="caption" color="secondary">Deposited at</Text>
                    <Text variant="caption" style={{ fontWeight: '500' }}>{formatDateTime(selectedCol.depositedAt)}</Text>
                  </View>
                )}
              </View>

              {/* People */}
              <View style={{ gap: spacing.s2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <User size={14} color={colors.ink2} />
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>People</Text>
                </View>
                {selectedCol?.submittedBy && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="caption" color="secondary">Submitted by</Text>
                    <Text variant="caption" style={{ fontWeight: '500' }}>{selectedCol.submittedBy}</Text>
                  </View>
                )}
                {selectedCol?.approvedBy && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="caption" color="secondary">Approved by</Text>
                    <Text variant="caption" style={{ fontWeight: '500' }}>{selectedCol.approvedBy}</Text>
                  </View>
                )}
                {selectedCol?.depositedBy && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="caption" color="secondary">Deposited by</Text>
                    <Text variant="caption" style={{ fontWeight: '500' }}>{selectedCol.depositedBy}</Text>
                  </View>
                )}
              </View>

            </ScrollView>
            
            <View style={{ padding: spacing.s4, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Button label="Done" onPress={() => setSelectedCol(null)} />
            </View>
            <SafeAreaView />
          </View>
        </View>
      </Modal>

      {/* Export Options Modal */}
      <Modal visible={showExportModal} animationType="fade" transparent>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.s4 }} onPress={() => setShowExportModal(false)}>
          <View style={{ backgroundColor: colors.canvas, borderRadius: radius.md, width: '100%', maxWidth: 300, overflow: 'hidden' }}>
            <View style={{ padding: spacing.s4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text variant="bodyMedium" style={{ fontWeight: '600' }}>Export Date Range</Text>
            </View>
            <Pressable onPress={() => { setShowExportModal(false); filterAndShareCSV('ALL'); }} style={{ padding: spacing.s4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text variant="bodyMedium">All time</Text>
            </Pressable>
            <Pressable onPress={() => { setShowExportModal(false); filterAndShareCSV('TODAY'); }} style={{ padding: spacing.s4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text variant="bodyMedium">Today</Text>
            </Pressable>
            <Pressable onPress={() => { setShowExportModal(false); filterAndShareCSV('MONTH'); }} style={{ padding: spacing.s4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text variant="bodyMedium">This month</Text>
            </Pressable>
            <Pressable onPress={() => { setShowExportModal(false); filterAndShareCSV('YEAR'); }} style={{ padding: spacing.s4 }}>
              <Text variant="bodyMedium">This year</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

    </Screen>
  );
}
