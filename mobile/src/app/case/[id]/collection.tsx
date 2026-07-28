import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme/useTheme';
import {
  Screen, Text, Button, Card, TextField, SelectField, DateField, Checkbox, LoadingView,
} from '@/components/ui';
import { PhotoPicker, type PickedPhoto } from '@/components/PhotoPicker';
import { allocationsApi } from '@/api/allocationsApi';
import { collectionsApi } from '@/api/collectionsApi';
import { PAYMENT_MODE_OPTIONS } from '@/utils/visitEnumLabels';
import { todayIso } from '@/utils/date';
import { extractApiError, isNetworkError } from '@/utils/extractApiError';
import { enqueueCollection } from '@/utils/offlineQueue';
import type { AllocationResponse } from '@/types/domain';
import type { PaymentMode } from '@/types/core';

export default function CollectionFormScreen() {
  const { id, visitId, amount: prefillAmount, paymentMode: prefillMode } = useLocalSearchParams<{
    id: string; visitId: string; amount?: string; paymentMode?: string;
  }>();
  const { spacing } = useTheme();

  const [allocation, setAllocation] = useState<AllocationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState(prefillAmount ?? '');
  const [paymentMode, setPaymentMode] = useState<PaymentMode | undefined>(
    (prefillMode as PaymentMode) || undefined,
  );
  const [notes, setNotes] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [upiReferenceId, setUpiReferenceId] = useState('');
  const [transactionReferenceId, setTransactionReferenceId] = useState('');
  const [cashAcknowledged, setCashAcknowledged] = useState(false);
  const [receipt, setReceipt] = useState<PickedPhoto[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    allocationsApi.getById(id).then(setAllocation).finally(() => setLoading(false));
  }, [id]);

  const onSubmit = async () => {
    setError(null);
    if (!id || !visitId || !allocation) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError('Enter the amount collected.'); return; }
    if (!paymentMode) { setError('Select a payment mode.'); return; }
    if (paymentMode === 'CASH' && !cashAcknowledged) {
      setError('Confirm you have safely deposited/secured the cash collected.');
      return;
    }

    const payload = {
      allocationId: id,
      organizationId: allocation.organizationId,
      amount: amt,
      paymentMode,
      collectionDate: todayIso(),
      notes: notes || undefined,
      visitId,
      chequeNumber: paymentMode === 'CHEQUE' ? (chequeNumber || undefined) : undefined,
      bankName: paymentMode === 'CHEQUE' ? (bankName || undefined) : undefined,
      upiReferenceId: paymentMode === 'UPI' ? (upiReferenceId || undefined) : undefined,
      transactionReferenceId: (paymentMode === 'NEFT' || paymentMode === 'RTGS') ? (transactionReferenceId || undefined) : undefined,
      cashHandlingAcknowledged: paymentMode === 'CASH' ? cashAcknowledged : undefined,
    };

    setSubmitting(true);
    try {
      const collection = await collectionsApi.submit(payload);

      if (receipt[0]) {
        await collectionsApi.uploadDocument(collection.id, receipt[0]).catch(() => {});
      }

      router.replace({ pathname: '/case/[id]', params: { id } });
    } catch (e) {
      if (isNetworkError(e)) {
        if (receipt[0]) {
          setError("You're offline and have a receipt photo attached — photos can't be queued. Retry once you have signal, or remove the photo to save offline.");
          return;
        }
        await enqueueCollection(payload);
        router.replace({ pathname: '/case/[id]', params: { id, savedOffline: '1' } });
        return;
      }
      setError(extractApiError(e, 'Could not record the collection. Try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingView label="Loading case…" />;

  return (
    <Screen>
      <View style={{ gap: spacing.s4 }}>
        <View>
          <Text variant="title" style={{ fontSize: 20 }}>Record collection</Text>
          <Text variant="caption" color="secondary">{allocation?.borrowerName} · {allocation?.loanNumber}</Text>
        </View>

        <Card style={{ gap: spacing.s4 }}>
          <TextField label="Amount collected" required keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0" />
          <SelectField label="Payment mode" required options={PAYMENT_MODE_OPTIONS} value={paymentMode} onChange={setPaymentMode} />

          {paymentMode === 'CHEQUE' ? (
            <>
              <TextField label="Cheque number" value={chequeNumber} onChangeText={setChequeNumber} />
              <TextField label="Bank name" value={bankName} onChangeText={setBankName} />
            </>
          ) : null}
          {paymentMode === 'UPI' ? (
            <TextField label="UPI reference ID" value={upiReferenceId} onChangeText={setUpiReferenceId} />
          ) : null}
          {(paymentMode === 'NEFT' || paymentMode === 'RTGS') ? (
            <TextField label="Transaction reference ID" value={transactionReferenceId} onChangeText={setTransactionReferenceId} />
          ) : null}
          {paymentMode === 'CASH' ? (
            <Checkbox
              label="I have safely secured the cash and will deposit it as per policy."
              checked={cashAcknowledged}
              onChange={setCashAcknowledged}
            />
          ) : null}

          <TextField label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Optional" />
          <PhotoPicker photos={receipt} onChange={setReceipt} max={1} label="Receipt photo (optional)" />
        </Card>

        {error ? <Text variant="caption" color="error">{error}</Text> : null}
        <Button label="Record collection" onPress={onSubmit} loading={submitting} />
      </View>
    </Screen>
  );
}
