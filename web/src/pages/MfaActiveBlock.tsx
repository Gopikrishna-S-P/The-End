import { AlertCircle, CheckCircle2, ShieldOff, Loader2 } from 'lucide-react';
import { OtpBoxes } from './MfaSetupWidgets';

interface Props {
  disableMode: boolean;
  setDisableMode: (v: boolean) => void;
  disableOtp: string;
  setDisableOtp: (v: string) => void;
  disableLoading: boolean;
  disableError: string | null;
  setDisableError: (v: string | null) => void;
  handleDisable: () => void;
}

export function MfaActiveBlock({
  disableMode, setDisableMode,
  disableOtp, setDisableOtp,
  disableLoading, disableError, setDisableError,
  handleDisable,
}: Props) {
  return (
    <>
      <div className="mfa-notice mfa-notice-success">
        <CheckCircle2 size={18} />
        <div>
          <strong>MFA is active</strong>
          Your account is protected with two-factor authentication.
        </div>
      </div>

      {!disableMode ? (
        <button type="button" onClick={() => setDisableMode(true)} className="mfa-btn-danger">
          <ShieldOff size={15} /> Disable MFA
        </button>
      ) : (
        <div className="mfa-card">
          <div className="mfa-notice mfa-notice-warn">
            <AlertCircle size={16} />
            <div>
              <strong>Confirm to disable MFA</strong>
              Enter your current authenticator code to confirm.
            </div>
          </div>
          {disableError && (
            <div className="banner banner-error" role="alert">
              <AlertCircle size={15} /><span>{disableError}</span>
            </div>
          )}
          <OtpBoxes value={disableOtp} onChange={setDisableOtp} disabled={disableLoading} />
          <div className="mfa-actions-row">
            <button
              type="button"
              onClick={() => { setDisableMode(false); setDisableError(null); setDisableOtp(''); }}
              className="mfa-btn-secondary"
              disabled={disableLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDisable}
              disabled={disableLoading || disableOtp.length < 6}
              className="mfa-btn-danger is-solid"
            >
              {disableLoading ? <Loader2 size={14} className="spinner-icon" /> : <ShieldOff size={14} />}
              Disable MFA
            </button>
          </div>
        </div>
      )}
    </>
  );
}
