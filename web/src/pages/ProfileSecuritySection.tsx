import { KeyRound, ShieldOff, Loader2 } from 'lucide-react';
import { useMfaSetup } from '../hooks/useMfaSetup';
import { MfaActiveBlock } from './MfaActiveBlock';
import { MfaSetupStepFlow } from './MfaSetupStepFlow';
import { SectionHeader } from './ProfileSettingsSectionHeader';
import '../styles/MfaSetupPage.css';

export function ProfileSecuritySection() {
  const {
    mfaEnabled,
    step, setStep, setupData,
    otpValue, setOtpValue,
    isLoading, isInitializing,
    error, setError,
    copiedSecret, recoveryCodes,
    codesAcknowledged, setCodesAcknowledged,
    copiedCodes,
    disableOtp, setDisableOtp,
    disableLoading, disableError, setDisableError,
    disableMode, setDisableMode,
    disableDone, setDisableDone,
    handleEnable, handleDisable,
    copySecret, copyRecoveryCodes, downloadRecoveryCodes,
  } = useMfaSetup();

  return (
    <section className="ps-section" aria-label="Security">
      <SectionHeader icon={<KeyRound size={18} />} title="Security" sub="Extra protection for your account" />
      <div className="ps-section-body">
        {isInitializing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-tertiary)', fontSize: 13 }}>
            <Loader2 size={14} className="ds-spin" /> Loading MFA settings…
          </div>
        ) : mfaEnabled && !disableDone ? (
          <MfaActiveBlock
            disableMode={disableMode} setDisableMode={setDisableMode}
            disableOtp={disableOtp} setDisableOtp={setDisableOtp}
            disableLoading={disableLoading} disableError={disableError}
            setDisableError={setDisableError} handleDisable={handleDisable}
          />
        ) : disableDone ? (
          <div className="mfa-success-stack">
            <div className="mfa-success-icon mfa-success-icon--warn">
              <ShieldOff size={28} />
            </div>
            <div>
              <h2 className="mfa-success-title">MFA disabled</h2>
              <p className="mfa-success-sub">Two-factor authentication has been removed from your account.</p>
            </div>
            <button type="button" className="btn-primary" onClick={() => { setDisableDone(false); setDisableMode(false); }}>
              <span className="btn-primary-text">Done</span>
            </button>
          </div>
        ) : (
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
    </section>
  );
}
