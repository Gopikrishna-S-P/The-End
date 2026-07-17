import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'react-router-dom';
import { authApi } from '../api';
import { Loader2, AlertCircle, ShieldCheck, ChevronLeft, ArrowRight } from 'lucide-react';
import { schema, type FormValues, OtpBoxes, PasswordStrength, EyeOpen, EyeClosed } from './ResetPasswordHelpers';
import { LoginBrandPanel } from './LoginBrandPanel';
import '../styles/LoginPage.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const presetEmail = searchParams.get('email') ?? '';
  const isWelcome   = searchParams.get('mode') === 'welcome';

  const [isVisible,    setIsVisible]    = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [done,         setDone]         = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [serverError,  setServerError]  = useState<string | null>(null);
  const [otpValue,     setOtpValue]     = useState('');
  const [step,         setStep]         = useState<1 | 2>(1);

  useEffect(() => { requestAnimationFrame(() => setIsVisible(true)); }, []);

  const { register, handleSubmit, setValue, watch, trigger, getValues, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { email: presetEmail, otp: '', newPassword: '', confirmPassword: '' },
    });

  const newPassword = watch('newPassword') ?? '';

  const handleOtpChange = (v: string) => {
    setOtpValue(v);
    setValue('otp', v, { shouldValidate: true });
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true); setServerError(null);
    try {
      await authApi.resetPassword({ email: data.email, otp: data.otp, newPassword: data.newPassword });
      setDone(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg    = err?.response?.data?.message;
      const retryAfter: number | undefined = err?.response?.data?.retryAfterSeconds;
      if (status === 400) {
        setServerError(msg || 'Invalid or expired OTP. Please request a new reset code.');
        setStep(1);
      } else if (status === 429) {
        setServerError(retryAfter
          ? `Too many attempts. Try again in ${retryAfter}s.`
          : 'Too many attempts. Please wait and try again.');
      } else {
        setServerError(msg || 'Something went wrong. Please try again.');
      }
    } finally { setIsLoading(false); }
  };

  const goToStep2 = async () => {
    setServerError(null);
    const ok = await trigger(['email', 'otp']);
    if (ok) setStep(2);
  };

  return (
    <div className="signin-page" style={{ opacity: isVisible ? 1 : 0, transition: 'opacity 300ms ease-out' }}>
      <main className="page" role="main">
        <LoginBrandPanel />

        <section className="right" aria-label="Reset password">
          <div className="form-wrap">
            {!done ? (
              <>
                <header className="form-header">
                  <div className="rp-step-label">
                    Step {step} of 2 · {step === 1 ? 'Verify' : 'Set password'}
                  </div>
                  <h2 className="form-title">
                    {isWelcome
                      ? (step === 1 ? 'Set your password' : 'Choose a password')
                      : (step === 1 ? 'Reset your password' : 'Choose a new password')
                    }
                  </h2>
                  <p className="form-sub">
                    {step === 1
                      ? (isWelcome
                          ? 'Enter your email and the 6-digit code from your welcome email.'
                          : 'Enter the email and the 6-digit code we sent to your inbox.')
                      : <>Set a strong password for{' '}<span className="mfa-email">{getValues('email') || 'your account'}</span>.</>
                    }
                  </p>
                </header>

                {serverError && (
                  <div className="banner banner-error" role="alert">
                    <AlertCircle size={15} /><span>{serverError}</span>
                  </div>
                )}

                <form onSubmit={step === 2 ? handleSubmit(onSubmit) : (e) => e.preventDefault()} noValidate>
                  {step === 1 && (
                    <>
                      <div className="field-group">
                        <div className="field-label-row">
                          <label className="field-label" htmlFor="rp-email">Email</label>
                        </div>
                        <div className="input-wrap">
                          <input
                            id="rp-email"
                            className={`input${errors.email ? ' error' : ''}`}
                            type="email" autoComplete="email"
                            placeholder="you@company.com"
                            aria-required="true" aria-invalid={!!errors.email}
                            {...register('email')}
                          />
                        </div>
                        {errors.email && <p className="field-helper error visible" role="alert">{errors.email.message}</p>}
                      </div>

                      <div className="field-group">
                        <div className="field-label-row">
                          <label className="field-label">One-time code</label>
                        </div>
                        <input type="hidden" {...register('otp')} value={otpValue} readOnly />
                        <OtpBoxes value={otpValue} onChange={handleOtpChange} />
                        <p className="field-helper muted visible">
                          {isWelcome
                            ? <>Check your welcome email for the 6-digit code.{' '}<a href="/forgot-password">Code expired?</a></>
                            : <>Check your email inbox for the 6-digit code.{' '}<a href="/forgot-password">Resend</a></>
                          }
                        </p>
                        {errors.otp && <p className="field-helper error visible" role="alert">{errors.otp.message}</p>}
                      </div>

                      <button type="button" onClick={goToStep2} className="btn-primary">
                        <span className="btn-primary-text">Continue</span>
                        <ArrowRight size={16} />
                      </button>
                      {!isWelcome && (
                        <a href="/login" className="link-back">
                          <ChevronLeft size={14} /> Back to sign in
                        </a>
                      )}
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <div className="field-group">
                        <div className="field-label-row">
                          <label className="field-label" htmlFor="rp-new">Password</label>
                        </div>
                        <div className="input-wrap">
                          <input
                            id="rp-new"
                            className={`input${errors.newPassword ? ' error' : ''}`}
                            type={showNew ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Create a strong password"
                            aria-required="true" aria-invalid={!!errors.newPassword}
                            autoFocus
                            {...register('newPassword')}
                          />
                          <div className="input-suffix">
                            <button type="button" className="pw-toggle"
                              onClick={() => setShowNew(v => !v)}
                              aria-label={showNew ? 'Hide password' : 'Show password'}
                              aria-pressed={showNew}
                            >
                              {showNew ? EyeClosed : EyeOpen}
                            </button>
                          </div>
                        </div>
                        {errors.newPassword && <p className="field-helper error visible" role="alert">{errors.newPassword.message}</p>}
                        <PasswordStrength password={newPassword} />
                      </div>

                      <div className="field-group">
                        <div className="field-label-row">
                          <label className="field-label" htmlFor="rp-confirm">Confirm password</label>
                        </div>
                        <div className="input-wrap">
                          <input
                            id="rp-confirm"
                            className={`input${errors.confirmPassword ? ' error' : ''}`}
                            type={showConfirm ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Re-enter your new password"
                            aria-required="true" aria-invalid={!!errors.confirmPassword}
                            {...register('confirmPassword')}
                          />
                          <div className="input-suffix">
                            <button type="button" className="pw-toggle"
                              onClick={() => setShowConfirm(v => !v)}
                              aria-label={showConfirm ? 'Hide password' : 'Show password'}
                              aria-pressed={showConfirm}
                            >
                              {showConfirm ? EyeClosed : EyeOpen}
                            </button>
                          </div>
                        </div>
                        {errors.confirmPassword && <p className="field-helper error visible" role="alert">{errors.confirmPassword.message}</p>}
                      </div>

                      <button
                        type="submit"
                        className={`btn-primary${isLoading ? ' loading' : ''}`}
                        disabled={isLoading}
                      >
                        <span className="btn-primary-text">Reset password</span>
                        <span className="btn-kbd" aria-label="keyboard shortcut Command Enter">⌘ ↵</span>
                        {isLoading && (
                          <span className="btn-spinner-abs" aria-hidden="true">
                            <Loader2 size={18} className="spinner-icon" />
                          </span>
                        )}
                      </button>
                      <button type="button" className="link-back"
                        onClick={() => { setStep(1); setServerError(null); }}
                      >
                        <ChevronLeft size={14} /> Use a different code
                      </button>
                    </>
                  )}

                  <footer className="form-footer">
                    <p className="form-footer-legal">
                      <a href="/privacy">Privacy</a> &nbsp;·&nbsp; <a href="/terms">Terms</a>
                    </p>
                  </footer>
                </form>
              </>
            ) : (
              <>
                <header className="form-header">
                  <div className="mfa-icon-row">
                    <div className="mfa-icon-badge"><ShieldCheck size={20} /></div>
                    <h2 className="form-title">{isWelcome ? 'Password set' : 'Password reset'}</h2>
                  </div>
                  <p className="form-sub">
                    {isWelcome
                      ? 'Your password is set. Sign in to access your account.'
                      : 'Your password has been updated. You can now sign in with your new password.'
                    }
                  </p>
                </header>

                <a href="/login?reason=password_changed" className="btn-primary">
                  <span className="btn-primary-text">Back to sign in</span>
                  <ArrowRight size={16} />
                </a>

                <footer className="form-footer">
                  <p className="form-footer-legal">
                    <a href="/privacy">Privacy</a> &nbsp;·&nbsp; <a href="/terms">Terms</a>
                  </p>
                </footer>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
