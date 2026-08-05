import { useEffect, useState } from 'react';
import { Share, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Share2, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, Button, Card, TextField, LoadingView } from '@/components/ui';
import { allocationsApi } from '@/api/allocationsApi';
import { paymentApi } from '@/api/paymentApi';
import { extractApiError } from '@/utils/extractApiError';
import type { AllocationResponse, PaymentLinkResponse } from '@/types/domain';

export default function PaymentLinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();

  const [allocation, setAllocation] = useState<AllocationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [link, setLink] = useState<PaymentLinkResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    allocationsApi.getById(id).then((a) => {
      setAllocation(a);
      if (a.totalDue) setAmount(String(a.totalDue));
    }).finally(() => setLoading(false));
  }, [id]);

  const onGenerate = async () => {
    setError(null);
    if (!id || !allocation) return;
    const amt = Number(amount);
    if (!amt || amt < 1) { setError('Enter an amount of at least ₹1.'); return; }

    setSubmitting(true);
    try {
      const intent = await paymentApi.createIntent({
        organizationId: allocation.organizationId,
        allocationId: id,
        amount: amt,
        purpose: purpose || undefined,
      });
      const created = await paymentApi.createLink({ intentId: intent.id, rail: 'UPI', issuedViaChannel: 'SMS' });
      setLink(created);
    } catch (e) {
      setError(extractApiError(e, 'Could not create the payment link. Try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const shareableUrl = link ? (link.shortUrl || link.targetUri || link.token) : null;

  const onShare = async () => {
    if (!shareableUrl) return;
    await Share.share({ message: `Pay your loan installment securely: ${shareableUrl}` });
  };

  if (loading) return <LoadingView label="Loading case…" />;

  return (
    <Screen>
      <View style={{ gap: spacing.s4 }}>
        <View>
          <Text variant="title" style={{ fontSize: 20 }}>Send payment link</Text>
          <Text variant="caption" color="secondary">{allocation?.borrowerName} · {allocation?.loanNumber}</Text>
        </View>

        {!link ? (
          <>
            <Card style={{ gap: spacing.s4 }}>
              <TextField label="Amount" required keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0" />
              <TextField label="Purpose" value={purpose} onChangeText={setPurpose} placeholder="e.g. EMI payment" />
            </Card>
            {error ? <Text variant="caption" color="error">{error}</Text> : null}
            <Button label="Generate link" onPress={onGenerate} loading={submitting} />
          </>
        ) : (
          <Card style={{ gap: spacing.s4, alignItems: 'center' }}>
            <CheckCircle2 size={40} color={colors.success} />
            <Text variant="bodyMedium" style={{ textAlign: 'center' }}>Payment link ready</Text>
            <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>{shareableUrl}</Text>
            <Button label="Share with borrower" onPress={onShare} icon={<Share2 size={16} color="#fff" />} />
          </Card>
        )}
      </View>
    </Screen>
  );
}
