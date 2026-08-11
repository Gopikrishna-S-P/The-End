import { useEffect, useState } from 'react';
import { Share, View, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Share2, CheckCircle2, Copy, Check, ExternalLink } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, Button, Card, TextField, LoadingView, SelectField, DateField } from '@/components/ui';
import { allocationsApi } from '@/api/allocationsApi';
import { paymentApi } from '@/api/paymentApi';
import { extractApiError } from '@/utils/extractApiError';
import { useToast } from '@/context/ToastContext';
import type { AllocationResponse, PaymentLinkResponse, PaymentRail, PaymentChannel } from '@/types/domain';

const RAILS: { label: string; value: PaymentRail }[] = [
  { value: 'UPI',         label: 'UPI' },
  { value: 'UPI_AUTOPAY', label: 'UPI Autopay' },
  { value: 'NACH',        label: 'NACH' },
  { value: 'EMANDATE',    label: 'e-Mandate' },
  { value: 'NEFT',        label: 'NEFT' },
  { value: 'RTGS',        label: 'RTGS' },
  { value: 'CHEQUE',      label: 'Cheque' },
  { value: 'CASH',        label: 'Cash' },
];

const CHANNELS: { label: string; value: PaymentChannel }[] = [
  { value: 'SMS',          label: 'SMS' },
  { value: 'WHATSAPP',     label: 'WhatsApp' },
  { value: 'RCS',          label: 'RCS' },
  { value: 'EMAIL',        label: 'Email' },
  { value: 'VOICE_IVR',    label: 'Voice IVR' },
  { value: 'VOICE_AGENT',  label: 'Voice agent' },
];

export default function PaymentLinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius } = useTheme();
  const { showToast } = useToast();

  const [allocation, setAllocation] = useState<AllocationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [rail, setRail] = useState<PaymentRail>('UPI');
  const [channel, setChannel] = useState<PaymentChannel>('SMS');
  const [link, setLink] = useState<PaymentLinkResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });

      const created = await paymentApi.createLink({
        intentId: intent.id,
        rail,
        issuedViaChannel: channel,
      });
      setLink(created);
      showToast('Payment link generated successfully', { type: 'success' });
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

  const copyToClipboard = async () => {
    if (!shareableUrl) return;
    await Clipboard.setStringAsync(shareableUrl);
    setCopied(true);
    showToast('Copied to clipboard', { type: 'info' });
    setTimeout(() => setCopied(false), 2000);
  };

  const openLink = async () => {
    if (!shareableUrl) return;
    await WebBrowser.openBrowserAsync(shareableUrl);
  };

  if (loading) return <LoadingView label="Loading case…" />;

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.s4, gap: spacing.s4 }}>
        <View>
          <Text variant="title" style={{ fontSize: 20 }}>Send payment link</Text>
          <Text variant="caption" color="secondary">{allocation?.borrowerName} · {allocation?.loanNumber}</Text>
        </View>

        {!link ? (
          <View style={{ gap: spacing.s4 }}>
            <Card style={{ gap: spacing.s4, padding: spacing.s4 }}>
              <TextField label="Amount (₹)" required keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0" />
              <TextField label="Purpose" value={purpose} onChangeText={setPurpose} placeholder="e.g. EMI payment" />
              <DateField label="Expires at" value={expiresAt} onChange={setExpiresAt} />
              
              <SelectField
                label="Payment Rail"
                required
                value={rail}
                options={RAILS}
                onChange={(val) => setRail(val)}
              />

              <SelectField
                label="Send via Channel"
                required
                value={channel}
                options={CHANNELS}
                onChange={(val) => setChannel(val)}
              />
            </Card>

            {error ? <Text variant="caption" color="error">{error}</Text> : null}
            <Button label="Generate link" onPress={onGenerate} loading={submitting} />
          </View>
        ) : (
          <Card style={{ gap: spacing.s5, alignItems: 'center', padding: spacing.s5 }}>
            <CheckCircle2 size={48} color={colors.success} />
            <View style={{ alignItems: 'center', gap: spacing.s1 }}>
              <Text variant="headline" style={{ textAlign: 'center' }}>Payment link ready</Text>
              <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
                Issued via {link.issuedViaChannel || channel}
              </Text>
            </View>

            <View style={[styles.urlContainer, { backgroundColor: colors.subtle, borderColor: colors.border, borderRadius: radius.md }]}>
              <Text variant="caption" numberOfLines={1} style={{ flex: 1, color: colors.ink2, fontFamily: 'System' }}>
                {shareableUrl}
              </Text>
            </View>

            <View style={{ width: '100%', gap: spacing.s2 }}>
              <Button label="Share with borrower" onPress={onShare} icon={<Share2 size={16} color={colors.white} />} />
              
              <View style={{ flexDirection: 'row', gap: spacing.s2 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label={copied ? 'Copied' : 'Copy Link'}
                    onPress={copyToClipboard}
                    variant="outline"
                    icon={copied ? <Check size={16} color={colors.success} /> : <Copy size={16} color={colors.ink1} />}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Open Link"
                    onPress={openLink}
                    variant="outline"
                    icon={<ExternalLink size={16} color={colors.ink1} />}
                  />
                </View>
              </View>
            </View>

            <Button label="Create another link" onPress={() => setLink(null)} variant="ghost" />
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    width: '100%',
  }
});
