import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Share } from 'react-native';
import { Search, IndianRupee, Link2, AlertCircle, CheckCircle2, Copy, Check, ExternalLink } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, Card, Button, TextField, SelectField, DateField, SegmentedTabs, Badge } from '@/components/ui';
import { paymentApi } from '@/api/paymentApi';
import { useToast } from '@/context/ToastContext';
import { extractApiError } from '@/utils/extractApiError';
import type { PaymentIntentResponse, PaymentLinkResponse, PaymentRail, PaymentChannel } from '@/types/domain';

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

export default function PaymentLinksScreen() {
  const { user } = useAuth();
  const orgId = user?.organizationId ?? '';
  const { colors, spacing, radius } = useTheme();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'create' | 'lookup'>('create');

  // ── Create-intent form ──
  const [allocationId, setAllocationId] = useState('');
  const [borrowerId, setBorrowerId] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [intentExpiresAt, setIntentExpiresAt] = useState('');
  const [rail, setRail] = useState<PaymentRail>('UPI');
  const [channel, setChannel] = useState<PaymentChannel>('SMS');
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [intentError, setIntentError] = useState<string | null>(null);

  // ── Lookup-by-id form ──
  const [lookupId, setLookupId] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // ── Active intent + issued link ──
  const [intent, setIntent] = useState<PaymentIntentResponse | null>(null);
  const [linkRail, setLinkRail] = useState<PaymentRail>('UPI');
  const [linkChannel, setLinkChannel] = useState<PaymentChannel>('SMS');
  const [creatingLink, setCreatingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [link, setLink] = useState<PaymentLinkResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmitIntent = allocationId.trim().length > 0 && Number(amount) >= 1 && orgId.length > 0;

  async function handleCreateIntent() {
    if (!canSubmitIntent) return;
    setCreatingIntent(true);
    setIntentError(null);
    setLink(null);
    try {
      const createdIntent = await paymentApi.createIntent({
        organizationId: orgId,
        allocationId: allocationId.trim(),
        borrowerId: borrowerId.trim() || undefined,
        amount: Number(amount),
        purpose: purpose.trim() || undefined,
        expiresAt: intentExpiresAt ? new Date(intentExpiresAt).toISOString() : undefined,
      });
      setIntent(createdIntent);
      
      // Auto-create link as web/mobile pattern for fast links
      const createdLink = await paymentApi.createLink({
        intentId: createdIntent.id,
        rail,
        issuedViaChannel: channel,
      });
      setLink(createdLink);
      showToast('Payment link generated!', { type: 'success' });
    } catch (e: any) {
      setIntentError(extractApiError(e, 'Failed to create payment intent.'));
    } finally {
      setCreatingIntent(false);
    }
  }

  async function handleLookup() {
    if (!lookupId.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setIntent(null);
    setLink(null);
    try {
      const found = await paymentApi.getIntent(lookupId.trim());
      setIntent(found);
      showToast('Intent found', { type: 'info' });
    } catch (e: any) {
      setLookupError(extractApiError(e, 'Intent not found or access denied.'));
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleCreateLink() {
    if (!intent) return;
    setCreatingLink(true);
    setLinkError(null);
    try {
      const created = await paymentApi.createLink({
        intentId: intent.id,
        rail: linkRail,
        issuedViaChannel: linkChannel,
      });
      setLink(created);
      showToast('Payment link issued!', { type: 'success' });
    } catch (e: any) {
      setLinkError(extractApiError(e, 'Failed to issue payment link.'));
    } finally {
      setCreatingLink(false);
    }
  }

  const shareableUrl = link ? (link.shortUrl || link.targetUri || link.token) : '';

  const handleShare = async () => {
    if (!shareableUrl) return;
    await Share.share({ message: `Secure Payment Link: ${shareableUrl}` });
  };

  const handleCopy = async () => {
    if (!shareableUrl) return;
    await Clipboard.setStringAsync(shareableUrl);
    setCopied(true);
    showToast('Copied to clipboard', { type: 'info' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = async () => {
    if (!shareableUrl) return;
    await WebBrowser.openBrowserAsync(shareableUrl);
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.s4, gap: spacing.s4 }}>
        <View style={{ gap: spacing.s1 }}>
          <Text variant="title">Payment Links</Text>
          <Text variant="caption" color="secondary">
            Manage links &amp; payment intents for allocations
          </Text>
        </View>

        <SegmentedTabs
          tabs={[
            { key: 'create', title: 'New Intent' },
            { key: 'lookup', title: 'Look Up Intent' }
          ]}
          activeTab={activeTab}
          onChange={(key) => {
            setActiveTab(key as 'create' | 'lookup');
            setIntent(null);
            setLink(null);
            setIntentError(null);
            setLookupError(null);
          }}
        />

        {activeTab === 'create' ? (
          <View style={{ gap: spacing.s4 }}>
            {!link ? (
              <Card style={{ gap: spacing.s4, padding: spacing.s4 }}>
                <Text variant="headline">Create Intent</Text>
                
                <TextField
                  label="Allocation ID"
                  required
                  value={allocationId}
                  onChangeText={setAllocationId}
                  placeholder="UUID from Allocations list"
                />

                <TextField
                  label="Borrower ID"
                  value={borrowerId}
                  onChangeText={setBorrowerId}
                  placeholder="Optional borrower UUID"
                />

                <View style={{ flexDirection: 'row', gap: spacing.s3 }}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Amount (₹)"
                      required
                      keyboardType="decimal-pad"
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0.00"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DateField
                      label="Expires At"
                      value={intentExpiresAt}
                      onChange={setIntentExpiresAt}
                    />
                  </View>
                </View>

                <TextField
                  label="Purpose"
                  value={purpose}
                  onChangeText={setPurpose}
                  placeholder="e.g. EMI Payment"
                />

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

                {intentError && <Text variant="caption" color="error">{intentError}</Text>}

                <Button
                  label="Create Intent & Link"
                  onPress={handleCreateIntent}
                  loading={creatingIntent}
                  disabled={!canSubmitIntent}
                  icon={<IndianRupee size={16} color={colors.white} />}
                />
              </Card>
            ) : (
              <Card style={{ gap: spacing.s4, alignItems: 'center', padding: spacing.s5 }}>
                <CheckCircle2 size={48} color={colors.success} />
                <Text variant="bodyMedium">Payment Link Generated Successfully</Text>
                <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
                  {shareableUrl}
                </Text>

                <View style={{ width: '100%', gap: spacing.s2 }}>
                  <Button label="Share link" onPress={handleShare} />
                  <View style={{ flexDirection: 'row', gap: spacing.s2 }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        label={copied ? 'Copied' : 'Copy'}
                        onPress={handleCopy}
                        variant="outline"
                        icon={copied ? <Check size={16} color={colors.success} /> : <Copy size={16} color={colors.ink1} />}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        label="Open"
                        onPress={handleOpen}
                        variant="outline"
                        icon={<ExternalLink size={16} color={colors.ink1} />}
                      />
                    </View>
                  </View>
                </View>

                <Button label="Create another" onPress={() => setLink(null)} variant="ghost" />
              </Card>
            )}
          </View>
        ) : (
          <View style={{ gap: spacing.s4 }}>
            {/* Lookup panel */}
            <Card style={{ gap: spacing.s3, padding: spacing.s4 }}>
              <Text variant="headline">Search by Intent ID</Text>
              <View style={{ flexDirection: 'row', gap: spacing.s2, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    value={lookupId}
                    onChangeText={setLookupId}
                    placeholder="Intent UUID"
                  />
                </View>
                <Button
                  label=""
                  onPress={handleLookup}
                  loading={lookupLoading}
                  disabled={!lookupId.trim()}
                  icon={<Search size={18} color={colors.white} />}
                  fullWidth={false}
                  style={{ height: 46, width: 48 }}
                />
              </View>
              {lookupError && <Text variant="caption" color="error">{lookupError}</Text>}
            </Card>

            {/* Looked up intent details */}
            {intent && (
              <Card style={{ gap: spacing.s4, padding: spacing.s4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="eyebrow" color="secondary">INTENT DETAILS</Text>
                  <Badge
                    tone={intent.status === 'CAPTURED' || intent.status === 'RECONCILED' ? 'success' : 'info'}
                    label={intent.status}
                  />
                </View>
                
                <View style={{ gap: spacing.s1 }}>
                  <Text variant="caption" color="secondary">Amount</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: '700', color: colors.ink1 }}>
                    ₹{intent.amount.toLocaleString('en-IN')}
                  </Text>
                </View>

                {intent.purpose && (
                  <View style={{ gap: spacing.s1 }}>
                    <Text variant="caption" color="secondary">Purpose</Text>
                    <Text variant="body">{intent.purpose}</Text>
                  </View>
                )}

                {/* Issue link for lookup intent if not done */}
                {!link ? (
                  <View style={{ gap: spacing.s3, marginTop: spacing.s2 }}>
                    <Text variant="eyebrow" color="secondary">ISSUE PAYMENT LINK</Text>
                    <SelectField
                      label="Payment Rail"
                      required
                      value={linkRail}
                      options={RAILS}
                      onChange={(val) => setLinkRail(val)}
                    />
                    <SelectField
                      label="Send via Channel"
                      required
                      value={linkChannel}
                      options={CHANNELS}
                      onChange={(val) => setLinkChannel(val)}
                    />
                    {linkError && <Text variant="caption" color="error">{linkError}</Text>}
                    <Button
                      label="Issue Link"
                      onPress={handleCreateLink}
                      loading={creatingLink}
                      icon={<Link2 size={16} color={colors.white} />}
                    />
                  </View>
                ) : (
                  <View style={{ gap: spacing.s3, marginTop: spacing.s2, alignItems: 'center' }}>
                    <CheckCircle2 size={32} color={colors.success} />
                    <Text variant="caption" color="secondary">{shareableUrl}</Text>
                    <View style={{ width: '100%', gap: spacing.s2 }}>
                      <Button label="Share Link" onPress={handleShare} />
                      <View style={{ flexDirection: 'row', gap: spacing.s2 }}>
                        <View style={{ flex: 1 }}>
                          <Button
                            label={copied ? 'Copied' : 'Copy'}
                            onPress={handleCopy}
                            variant="outline"
                            icon={copied ? <Check size={16} color={colors.success} /> : <Copy size={16} color={colors.ink1} />}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button
                            label="Open"
                            onPress={handleOpen}
                            variant="outline"
                            icon={<ExternalLink size={16} color={colors.ink1} />}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </Card>
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({});
