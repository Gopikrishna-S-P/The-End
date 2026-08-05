import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, Button, Card, TextField, DateField, LoadingView } from '@/components/ui';
import { allocationsApi } from '@/api/allocationsApi';
import { ptpsApi } from '@/api/ptpsApi';
import { extractApiError, isNetworkError } from '@/utils/extractApiError';
import { enqueuePtp } from '@/utils/offlineQueue';
import type { AllocationResponse } from '@/types/domain';

function tomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

export default function PtpFormScreen() {
  const { id, visitId } = useLocalSearchParams<{ id: string; visitId?: string }>();
  const { user } = useAuth();
  const { spacing } = useTheme();

  const [allocation, setAllocation] = useState<AllocationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [promisedDate, setPromisedDate] = useState<string>();
  const [promisedAmount, setPromisedAmount] = useState('');
  const [contactNotes, setContactNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    allocationsApi.getById(id).then(setAllocation).finally(() => setLoading(false));
  }, [id]);

  const onSubmit = async () => {
    setError(null);
    if (!id || !allocation || !user) return;
    if (!promisedDate) { setError('Pick the promised date.'); return; }
    const amount = Number(promisedAmount);
    if (!amount || amount <= 0) { setError('Enter a promised amount.'); return; }

    const payload = {
      allocationId: id,
      agentId: user.id,
      agentName: `${user.firstName} ${user.lastName}`.trim(),
      loanNumber: allocation.loanNumber,
      borrowerName: allocation.borrowerName,
      promisedDate,
      promisedAmount: amount,
      contactNotes: contactNotes || undefined,
      visitId: visitId || undefined,
    };

    setSubmitting(true);
    try {
      await ptpsApi.create(payload);
      router.replace({ pathname: '/case/[id]', params: { id } });
    } catch (e) {
      if (isNetworkError(e)) {
        const queued = await enqueuePtp(payload);
        if (!queued) {
          setError('Too many items waiting to sync — connect to the internet before saving more offline.');
          return;
        }
        router.replace({ pathname: '/case/[id]', params: { id, savedOffline: '1' } });
        return;
      }
      setError(extractApiError(e, 'Could not create the PTP. Try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingView label="Loading case…" />;

  return (
    <Screen>
      <View style={{ gap: spacing.s4 }}>
        <View>
          <Text variant="title" style={{ fontSize: 20 }}>Promise to pay</Text>
          <Text variant="caption" color="secondary">{allocation?.borrowerName} · {allocation?.loanNumber}</Text>
        </View>

        <Card style={{ gap: spacing.s4 }}>
          <DateField label="Promised date" required value={promisedDate} onChange={setPromisedDate} minimumDate={tomorrow()} />
          <TextField label="Promised amount" required keyboardType="decimal-pad" value={promisedAmount} onChangeText={setPromisedAmount} placeholder="0" />
          <TextField label="Contact notes" value={contactNotes} onChangeText={setContactNotes} multiline placeholder="Any details worth recording" />
        </Card>

        {error ? <Text variant="caption" color="error">{error}</Text> : null}
        <Button label="Create PTP" onPress={onSubmit} loading={submitting} />
      </View>
    </Screen>
  );
}
