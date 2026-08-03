import type { FormEventHandler } from 'react';
import { Loader2, AlertCircle, CheckCircle2, MoveRight, Eye, EyeOff } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { LoginForm } from './LoginTypes';

interface Props {
  register: UseFormRegister<LoginForm>;
  errors: FieldErrors<LoginForm>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  setCapsOn: (v: boolean) => void;
  capsOn: boolean;
  rememberDevice: boolean;
  setRememberDeviceState: (v: boolean) => void;
  serverError: string | null;
  reason: string | null;
  isLoading: boolean;
  setShowContact: (v: boolean) => void;
}

export function LoginCredentialsForm(p: Props) {
  return (
    <>
      <header className="form-header">
        <p className="rp-step-label">Sign in · Secure session</p>
        <h2 className="form-title">Welcome back.</h2>
        <p className="form-sub">Sign in to access your organisation's recovery workspace.</p>
      </header>

      {p.reason === 'password_changed' && !p.serverError && (
        <div className="banner banner-success" role="status">
          <CheckCircle2 size={15} />
          <span>Password changed. Please sign in with your new password.</span>
        </div>
      )}
      {p.reason && p.reason !== 'password_changed' && !p.serverError && (
        <div className="banner banner-warn" role="status">
          <AlertCircle size={15} />
          <span>Your session has expired. Please sign in again.</span>
        </div>
      )}
      {p.serverError && (
        <div className="banner banner-error" role="alert">
          <AlertCircle size={15} />
          <span>{p.serverError}</span>
        </div>
      )}

      <form onSubmit={p.onSubmit} noValidate autoComplete="off">
        <div className="field-group">
          <div className="field-label-row">
            <label className="field-label" htmlFor="email">Email</label>
          </div>
          <div className="input-wrap">
            <input
              className={`input${p.errors.email ? ' error' : ''}`}
              type="email"
              id="email"
              autoComplete="email"
              placeholder="you@company.com"
              aria-required="true"
              aria-invalid={!!p.errors.email}
              autoFocus
              {...p.register('email')}
            />
          </div>
          {p.errors.email && (
            <p className="field-helper error visible" role="alert">{p.errors.email.message}</p>
          )}
        </div>

        <div className="field-group">
          <div className="field-label-row">
            <label className="field-label" htmlFor="password">Password</label>
          </div>
          <div className="input-wrap">
            <input
              className={`input${p.errors.password ? ' error' : ''}`}
              type={p.showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              placeholder="••••••••"
              aria-required="true"
              aria-invalid={!!p.errors.password}
              {...p.register('password', { onBlur: () => p.setCapsOn(false) })}
              onKeyUp={e => {
                if (typeof e.getModifierState === 'function') p.setCapsOn(e.getModifierState('CapsLock'));
              }}
            />
            <div className="input-suffix">
              <button type="button" className="pw-toggle"
                onClick={() => p.setShowPassword(v => !v)}
                aria-label={p.showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={p.showPassword}>
                {p.showPassword ? (
                  <EyeOff size={16} aria-hidden="true" />
                ) : (
                  <Eye size={16} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          {p.capsOn && !p.errors.password && (
            <p className="field-helper error visible" aria-live="polite">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 1L11 10H1L6 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
                <path d="M6 5v2.5M6 9v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Caps Lock is on
            </p>
          )}
          {p.errors.password && (
            <p className="field-helper error visible" role="alert">{p.errors.password.message}</p>
          )}
        </div>

        <div className="row-below-pw">
          <label className="checkbox-row" htmlFor="remember">
            <input type="checkbox" className="checkbox-input" id="remember" name="remember"
              checked={p.rememberDevice} onChange={e => p.setRememberDeviceState(e.target.checked)} />
            <span className="checkbox-box" aria-hidden="true">
              <svg className="checkbox-check" width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="checkbox-label">Remember this device</span>
          </label>
          <a href="/forgot-password" className="forgot-link">Forgot password?</a>
        </div>

        <button type="submit"
          className={`btn-primary pm-magnetic pm-ripple pm-press pm-focus-ring${p.isLoading ? ' loading' : ''}`}
          disabled={p.isLoading}>
          {p.isLoading ? (
            <><Loader2 size={15} className="spinner-icon" aria-hidden="true" /><span className="btn-primary-text">Signing in…</span></>
          ) : (
            <><span className="btn-primary-text pm-magnetic-target">Sign in</span><MoveRight size={18} aria-hidden="true" /></>
          )}
        </button>

        <footer className="form-footer">
          <div className="form-footer-row">
            <span>Don't have an account?</span>
            <button type="button" className="request-access-btn" onClick={() => p.setShowContact(true)}>Request access <MoveRight size={14} aria-hidden="true" /></button>
          </div>
          <p className="form-footer-legal"><a href="/privacy">Privacy</a> &nbsp;·&nbsp; <a href="/terms">Terms</a></p>
        </footer>
      </form>
    </>
  );
}
