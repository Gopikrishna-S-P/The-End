import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../client';
import type { MfaSetupResponse, MfaEnableResponse, EnableMfaRequest, ApiResponse } from '../types';
import { ShieldCheck, ShieldOff, Loader2, ArrowRight } from 'lucide-react';
import { MfaActiveBlock } from './MfaActiveBlock';
import { MfaSetupStepFlow } from './MfaSetupStepFlow';
import { profileSettings } from '../utils/profileSettings';
import './Dashboard.css';
import '../styles/MfaSetupPage.css';

export default function MfaSetupPage() {
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

  if (isInitializing) {
    return (
      <div className="db-root">
        <div className="db-content">
          <div className="mfa-initial-loader">
            <Loader2 size={28} className="spinner-icon" />
            <p>Loading MFA settings…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="db-root">
      <div className="db-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="db-inner ds-card db-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <header className="db-card-head" style={{ padding: '16px 24px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="db-att-chip" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-subtle)', color: 'var(--ink-solid)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h2 className="db-card-title">Two-Factor Authentication</h2>
                <span className="db-kpi2-foot-meta">Secure your account with an authenticator app</span>
              </div>
            </div>
          </header>

          <div style={{ padding: 24, flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {mfaEnabled && !disableDone && (
              <MfaActiveBlock
                disableMode={disableMode} setDisableMode={setDisableMode}
                disableOtp={disableOtp} setDisableOtp={setDisableOtp}
                disableLoading={disableLoading} disableError={disableError}
                setDisableError={setDisableError} handleDisable={handleDisable}
              />
            )}

            {disableDone && (
              <div className="mfa-success-stack">
                <div className="mfa-success-icon mfa-success-icon--warn">
                  <ShieldOff size={28} />
                </div>
                <div>
                  <h2 className="mfa-success-title">MFA disabled</h2>
                  <p className="mfa-success-sub">Two-factor authentication has been removed from your account.</p>
                </div>
                <button type="button" className="btn-primary" onClick={() => profileSettings.show()}>
                  <span className="btn-primary-text">Back to profile</span><ArrowRight size={16} />
                </button>
              </div>
            )}

            {!mfaEnabled && !disableDone && (
              <MfaSetupStepFlow
                step={step} setStep={setStep} setupData={setupData}
                otpValue={otpValue} setOtpValue={setOtpValue}
                isLoading={isLoading} error={error} setError={setError}
                recoveryCodes={recoveryCodes}
                codesAcknowledged={codesAcknowledged} setCodesAcknowledged={setCodesAcknowledged}
                copiedSecret={copiedSecret} copiedCodes={copiedCodes}
                copySecret={copySecret} copyRecoveryCodes={copyRecoveryCodes}
                downloadRecoveryCodes={downloadRecoveryCodes} handleEnable={handleEnable}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
