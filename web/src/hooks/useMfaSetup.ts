import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../client';
import type { MfaSetupResponse, MfaEnableResponse, EnableMfaRequest, ApiResponse } from '../types';

export function useMfaSetup() {
  const { user, refreshAuth } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [otpValue, setOtpValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [codesAcknowledged, setCodesAcknowledged] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [disableOtp, setDisableOtp] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);
  const [disableMode, setDisableMode] = useState(false);
  const [disableDone, setDisableDone] = useState(false);

  const mfaEnabled = user?.mfaEnabled ?? false;

  useEffect(() => {
    if (!mfaEnabled) { initSetup(); } else { setIsInitializing(false); }
  }, [mfaEnabled]);

  const initSetup = async () => {
    setIsInitializing(true);
    try {
      const { data } = await apiClient.post<ApiResponse<MfaSetupResponse>>('/api/v1/auth/mfa/setup');
      setSetupData(data.data);
    } catch { setError('Failed to initialize MFA setup. Please try again.'); }
    finally { setIsInitializing(false); }
  };

  const handleEnable = async () => {
    if (otpValue.length < 6) { setError('Please enter a complete 6-digit code.'); return; }
    setIsLoading(true); setError(null);
    try {
      const { data } = await apiClient.post<ApiResponse<MfaEnableResponse>>('/api/v1/auth/mfa/enable', { totp_code: otpValue } as EnableMfaRequest);
      setRecoveryCodes(data.data?.recoveryCodes ?? []);
      await refreshAuth();
      setStep(3);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401 || status === 400) setError('Invalid authenticator code. Please check your app and try again.');
      else setError('Failed to enable MFA. Please try again.');
    } finally { setIsLoading(false); }
  };

  const handleDisable = async () => {
    if (disableOtp.length < 6) { setDisableError('Please enter a complete 6-digit code.'); return; }
    setDisableLoading(true); setDisableError(null);
    try {
      await apiClient.post('/api/v1/auth/mfa/disable', { totpCode: disableOtp });
      await refreshAuth();
      setDisableDone(true);
    } catch { setDisableError('Invalid code. Please try again.'); }
    finally { setDisableLoading(false); }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard?.writeText(setupData.secret);
      setCopiedSecret(true); setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard?.writeText(recoveryCodes.join('\n'));
    setCopiedCodes(true); setTimeout(() => setCopiedCodes(false), 2000);
  };

  const downloadRecoveryCodes = () => {
    const text = `RecoverPro MFA Recovery Codes\nGenerated: ${new Date().toISOString()}\n\nStore these codes safely. Each code can only be used once.\n\n${recoveryCodes.join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'recoverpro-mfa-recovery-codes.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  return {
    mfaEnabled,
    step, setStep,
    setupData,
    otpValue, setOtpValue,
    isLoading,
    isInitializing,
    error, setError,
    copiedSecret,
    recoveryCodes,
    codesAcknowledged, setCodesAcknowledged,
    copiedCodes,
    disableOtp, setDisableOtp,
    disableLoading,
    disableError, setDisableError,
    disableMode, setDisableMode,
    disableDone, setDisableDone,
    handleEnable,
    handleDisable,
    copySecret,
    copyRecoveryCodes,
    downloadRecoveryCodes,
  };
}
