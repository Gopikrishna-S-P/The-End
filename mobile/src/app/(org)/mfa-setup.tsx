import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Screen, Text, Button, Card, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/api/authApi';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/theme/useTheme';

export default function MfaSetupScreen() {
  const { user, refreshAuth } = useAuth();
  const { showToast } = useToast();
  const { spacing, colors } = useTheme();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeUri?: string; manualEntryKey?: string } | null>(null);
  const [otpValue, setOtpValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [codesAcknowledged, setCodesAcknowledged] = useState(false);

  useEffect(() => {
    if (user?.mfaEnabled) {
      setStep(4);
    } else {
      initSetup();
    }
  }, [user]);

  const initSetup = async () => {
    setIsLoading(true);
    try {
      const data = await authApi.setupMfa();
      setSetupData(data);
    } catch (err) {
      setError('Failed to initialize MFA setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable = async () => {
    if (otpValue.length < 6) {
      setError('Please enter a complete 6-digit code.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await authApi.enableMfa(otpValue);
      setRecoveryCodes(data.recoveryCodes ?? []);
      await refreshAuth();
      setStep(3);
      showToast('MFA enabled successfully!', { type: 'success' });
    } catch (err: any) {
      setError('Invalid authenticator code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = async () => {
    if (setupData?.secret) {
      await Clipboard.setStringAsync(setupData.secret);
      setCopiedSecret(true);
      showToast('Secret key copied to clipboard!', { type: 'success' });
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const copyRecoveryCodes = async () => {
    await Clipboard.setStringAsync(recoveryCodes.join('\n'));
    showToast('Recovery codes copied to clipboard!', { type: 'success' });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: spacing.s4, paddingBottom: spacing.s8 }}>
        {/* Step indicators */}
        {step < 4 && (
          <View style={[styles.stepIndicator, { gap: spacing.s2 }]}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: s === step ? colors.accent : colors.borderStrong,
                    flex: 1,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {step === 1 && setupData && (
          <Card style={{ gap: spacing.s4 }}>
            <Text variant="headline" style={{ fontWeight: '700' }}>Step 1: Setup Authenticator</Text>
            <Text variant="body" color="secondary">
              Due to mobile environment constraints, please manually enter the secret key below in your authenticator app (such as Google Authenticator or Authy).
            </Text>

            <View style={[styles.secretBox, { backgroundColor: colors.subtle, padding: spacing.s3, borderRadius: 8 }]}>
              <Text variant="caption" color="secondary" style={{ marginBottom: spacing.s1 }}>SECRET KEY</Text>
              <Text variant="bodyMedium" selectable style={[styles.secretText, { color: colors.ink1 }]}>
                {setupData.secret}
              </Text>
            </View>

            <Button
              label={copiedSecret ? "Copied Key!" : "Copy Key"}
              onPress={copySecret}
              variant="outline"
            />
            <Button
              label="Continue"
              onPress={() => setStep(2)}
              variant="primary"
            />
          </Card>
        )}

        {step === 2 && (
          <Card style={{ gap: spacing.s4 }}>
            <Text variant="headline" style={{ fontWeight: '700' }}>Step 2: Enter Verification Code</Text>
            <Text variant="body" color="secondary">
              Enter the current 6-digit code shown in your authenticator app.
            </Text>

            <TextField
              placeholder="000 000"
              value={otpValue}
              onChangeText={setOtpValue}
              keyboardType="number-pad"
              maxLength={6}
              error={error ?? undefined}
            />

            <View style={{ flexDirection: 'row', gap: spacing.s3 }}>
              <Button
                label="Back"
                onPress={() => { setStep(1); setError(null); }}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                label="Verify"
                onPress={handleEnable}
                variant="primary"
                loading={isLoading}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        )}

        {step === 3 && (
          <Card style={{ gap: spacing.s4 }}>
            <Text variant="headline" style={{ fontWeight: '700', color: colors.warnInk }}>Step 3: Save Recovery Codes</Text>
            <Text variant="body" color="secondary">
              If you lose your phone, you can use these recovery codes to sign back in. Store them safely. Each code works only once.
            </Text>

            <View style={[styles.codesContainer, { borderColor: colors.border }]}>
              {recoveryCodes.map((code) => (
                <View key={code} style={styles.codeRow}>
                  <Text variant="bodyMedium" selectable style={{ color: colors.ink1 }}>{code}</Text>
                </View>
              ))}
            </View>

            <Button
              label="Copy All Codes"
              onPress={copyRecoveryCodes}
              variant="outline"
            />

            <Button
              label="I have saved these codes"
              onPress={() => setStep(4)}
              disabled={isLoading}
              variant="primary"
            />
          </Card>
        )}

        {step === 4 && (
          <Card style={{ gap: spacing.s4, alignItems: 'center', paddingVertical: spacing.s6 }}>
            <Text variant="headline" style={{ fontWeight: '700', color: colors.success }}>MFA is Enabled</Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
              Your account is now protected with two-factor authentication.
            </Text>
            <Button
              label="Go Back to Profile"
              onPress={() => router.back()}
              variant="primary"
              style={{ alignSelf: 'stretch' }}
            />
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    height: 4,
    width: '100%',
  },
  stepDot: {
    height: 4,
    borderRadius: 2,
  },
  secretBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  secretText: {
    fontSize: 16,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  codesContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  codeRow: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEDF1',
    alignItems: 'center',
  },
});
