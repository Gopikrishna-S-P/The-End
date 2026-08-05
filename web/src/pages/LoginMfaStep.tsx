import { Loader2, AlertCircle, ShieldCheck, ChevronLeft } from 'lucide-react';
import { OtpBoxes } from './OtpBoxes';
import { loadingSplash } from '../utils/loadingSplash';

interface Props {
  mfaEmail: string;
  serverError: string | null;
  totpCode: string;
  setTotpCode: (v: string) => void;
  useRecoveryCode: boolean;
  recoveryCode: string;
  setRecoveryCode: (v: string) => void;
  onToggleRecoveryCode: () => void;
  isLoading: boolean;
  onSubmitMfa: () => void;
  onBack: () => void;
}

export function LoginMfaStep(p: Props) {
  const canSubmit = p.useRecoveryCode ? p.recoveryCode.trim().length > 0 : p.totpCode.length >= 6;
  return (
    <div className="mfa-stage">
      <header className="form-header">
        <p className="rp-step-label">Sign in · Step 2 of 2</p>
        <div className="mfa-icon-row">
          <div className="mfa-icon-badge"><ShieldCheck size={22} /></div>
          <h2 className="form-title">Verify it's you.</h2>
        </div>
        <p className="form-sub">
          {p.useRecoveryCode
            ? <>Enter one of the recovery codes you saved when you set up MFA for{' '}<span className="mfa-email">{p.mfaEmail}</span>.</>
            : <>Open your authenticator app and enter the 6-digit verification code for{' '}<span className="mfa-email">{p.mfaEmail}</span>.</>}
        </p>
      </header>

      {p.serverError && (
        <div className="banner banner-error" role="alert">
          <AlertCircle size={15} />
          <span>{p.serverError}</span>
        </div>
      )}

      {p.useRecoveryCode ? (
        <input
          type="text"
          className="input"
          placeholder="Recovery code"
          value={p.recoveryCode}
          onChange={e => p.setRecoveryCode(e.target.value)}
          disabled={p.isLoading}
          autoFocus
          style={{ marginBottom: 24 }}
        />
      ) : (
        <OtpBoxes value={p.totpCode} onChange={p.setTotpCode} disabled={p.isLoading} />
      )}

      <button
        type="button"
        className={`btn-primary pm-magnetic pm-ripple pm-press pm-focus-ring${p.isLoading ? ' loading' : ''}`}
        onClick={() => { if (canSubmit) loadingSplash.show(3000); p.onSubmitMfa(); }}
        disabled={p.isLoading || !canSubmit}>
        {p.isLoading ? (
          <><Loader2 size={15} className="spinner-icon" aria-hidden="true" /><span className="btn-primary-text">Verifying…</span></>
        ) : (
          <><span className="btn-primary-text pm-magnetic-target">Verify &amp; Sign in</span><span className="btn-kbd" aria-label="keyboard shortcut Enter">↵</span></>
        )}
      </button>

      <button type="button" className="link-back" onClick={p.onToggleRecoveryCode}>
        {p.useRecoveryCode ? 'Use authenticator app instead' : 'Use a recovery code instead'}
      </button>

      <button type="button" className="link-back" onClick={p.onBack}>
        <ChevronLeft size={14} /> Use a different account
      </button>
    </div>
  );
}
