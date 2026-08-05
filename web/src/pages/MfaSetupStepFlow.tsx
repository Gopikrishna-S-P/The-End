import { QRCodeSVG } from 'qrcode.react';
import type { MfaSetupResponse } from '../types';
import {
  QrCode, Lock, Copy, Check, ArrowRight, ChevronLeft,
  AlertCircle, ShieldCheck, KeyRound, Download, Loader2,
} from 'lucide-react';
import { OtpBoxes, Steps } from './MfaSetupWidgets';
import { profileSettings } from '../utils/profileSettings';

interface Props {
  step: 1 | 2 | 3 | 4;
  setStep: (s: 1 | 2 | 3 | 4) => void;
  setupData: MfaSetupResponse | null;
  otpValue: string;
  setOtpValue: (v: string) => void;
  isLoading: boolean;
  error: string | null;
  setError: (v: string | null) => void;
  recoveryCodes: string[];
  codesAcknowledged: boolean;
  setCodesAcknowledged: (v: boolean) => void;
  copiedSecret: boolean;
  copiedCodes: boolean;
  copySecret: () => void;
  copyRecoveryCodes: () => void;
  downloadRecoveryCodes: () => void;
  handleEnable: () => void;
}

export function MfaSetupStepFlow({
  step, setStep, setupData, otpValue, setOtpValue,
  isLoading, error, setError, recoveryCodes,
  codesAcknowledged, setCodesAcknowledged,
  copiedSecret, copiedCodes, copySecret, copyRecoveryCodes, downloadRecoveryCodes,
  handleEnable,
}: Props) {
  return (
    <>
      {step < 4 && <Steps current={step} />}

      {step === 1 && setupData && (
        <>
          <div className="mfa-card">
            <p className="mfa-card-instruction">
              Scan this QR code with Google Authenticator, Authy, or any TOTP app on your phone.
            </p>
            <div className="mfa-qr-frame">
              <div className="mfa-qr-inner">
                {setupData.qrCodeUri ? (
                  <QRCodeSVG value={setupData.qrCodeUri} size={160} bgColor="#ffffff" fgColor="#0C0A09" level="M" />
                ) : (
                  <div className="mfa-qr-fallback">
                    <QrCode size={36} /><span>QR code</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="mfa-secret-label">Can't scan? Enter this key manually</div>
              <div className="mfa-secret-row">
                <Lock size={13} className="mfa-secret-icon" />
                <code className="mfa-secret-code">{setupData.secret}</code>
                <button
                  type="button"
                  onClick={copySecret}
                  className={`mfa-icon-btn${copiedSecret ? ' is-success' : ''}`}
                  aria-label={copiedSecret ? 'Copied' : 'Copy secret'}
                >
                  {copiedSecret ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              {setupData.manualEntryKey && <p className="mfa-manual-key">Manual key: {setupData.manualEntryKey}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
            <button type="button" onClick={() => setStep(2)} className="btn-primary" style={{ marginBottom: 0 }}>
              <span className="btn-primary-text">Continue</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="mfa-card">
            <div className="mfa-notice mfa-notice-info">
              <ShieldCheck size={16} />
              <div>Open your authenticator app and enter the current 6-digit code.</div>
            </div>
            {error && (
              <div className="banner banner-error" role="alert">
                <AlertCircle size={15} /><span>{error}</span>
              </div>
            )}
            <OtpBoxes value={otpValue} onChange={setOtpValue} disabled={isLoading} />
          </div>
          <div className="mfa-actions-row">
            <button type="button" onClick={() => { setStep(1); setError(null); setOtpValue(''); }} className="mfa-btn-secondary" disabled={isLoading}>
              <ChevronLeft size={14} /> Back
            </button>
            <button type="button" onClick={handleEnable} disabled={isLoading || otpValue.length < 6} className={`btn-primary${isLoading ? ' loading' : ''}`}>
              <span className="btn-primary-text">Enable MFA</span>
              <ShieldCheck size={16} />
              {isLoading && <span className="btn-spinner-abs" aria-hidden="true"><Loader2 size={18} className="spinner-icon" /></span>}
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="mfa-card">
            <div className="mfa-notice mfa-notice-warn">
              <KeyRound size={16} />
              <div>
                <strong>Save your recovery codes</strong>
                These let you access your account if you lose your authenticator. Each code works once only.
              </div>
            </div>
            <div className="mfa-codes-grid">
              {recoveryCodes.map((code) => <div key={code} className="mfa-code-cell">{code}</div>)}
            </div>
            <div className="mfa-codes-actions">
              <button type="button" onClick={copyRecoveryCodes} className={`mfa-btn-secondary${copiedCodes ? ' is-success' : ''}`}>
                {copiedCodes ? <Check size={14} /> : <Copy size={14} />}{copiedCodes ? 'Copied' : 'Copy'}
              </button>
              <button type="button" onClick={downloadRecoveryCodes} className="mfa-btn-secondary">
                <Download size={14} /> Download
              </button>
            </div>
            <label className="mfa-ack-row">
              <input type="checkbox" checked={codesAcknowledged} onChange={(e) => setCodesAcknowledged(e.target.checked)} />
              <span className="mfa-ack-text">I have saved my recovery codes in a secure location.</span>
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setStep(4)} disabled={!codesAcknowledged} className="btn-primary">
              <span className="btn-primary-text">Done</span><ArrowRight size={16} />
            </button>
          </div>
        </>
      )}

      {step === 4 && (
        <div className="mfa-success-stack">
          <div className="mfa-success-icon">
            <ShieldCheck size={32} />
            <span className="mfa-success-icon-check" aria-hidden="true"><Check size={12} /></span>
          </div>
          <div>
            <h2 className="mfa-success-title">MFA enabled</h2>
            <p className="mfa-success-sub">Your account is now protected. You'll be asked for a code at each sign-in.</p>
          </div>
          <button type="button" className="btn-primary" onClick={() => profileSettings.show()}>
            <span className="btn-primary-text">Go to profile</span><ArrowRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
