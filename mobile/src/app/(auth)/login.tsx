import { useState } from 'react';
import { View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/useTheme';
import { Screen, Text, Button, TextField, Card } from '@/components/ui';
import { extractApiError } from '@/utils/extractApiError';

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors, spacing } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (mfaRequired && totpCode.trim().length < 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(email.trim(), password, mfaRequired ? totpCode.trim() : undefined);
      if (result.mfaRequired) {
        setMfaRequired(true);
        setError(null);
      }
    } catch (e) {
      setError(extractApiError(e, 'Could not sign in. Check your details and try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.s6 }}>
        <View style={{ alignItems: 'center', gap: spacing.s3 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 20, backgroundColor: colors.accentSubtle,
            alignItems: 'center', justifyContent: 'center',
          }}
          >
            <ShieldCheck size={30} color={colors.accent} />
          </View>
          <Text variant="title">RecoverPro Field</Text>
          <Text variant="body" color="secondary">Sign in to view your assigned cases</Text>
        </View>

        <Card style={{ gap: spacing.s4 }}>
          <TextField
            label="Email"
            required
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@organization.com"
            editable={!mfaRequired}
          />
          <TextField
            label="Password"
            required
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            editable={!mfaRequired}
          />
          {mfaRequired ? (
            <TextField
              label="Authentication code"
              required
              keyboardType="number-pad"
              maxLength={6}
              value={totpCode}
              onChangeText={setTotpCode}
              placeholder="123456"
              autoFocus
            />
          ) : null}

          {error ? <Text variant="caption" color="error">{error}</Text> : null}

          <Button label={mfaRequired ? 'Verify & sign in' : 'Sign in'} onPress={onSubmit} loading={submitting} />

          {mfaRequired ? (
            <Button
              label="Use a different account"
              variant="ghost"
              onPress={() => { setMfaRequired(false); setTotpCode(''); setPassword(''); setError(null); }}
            />
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}
