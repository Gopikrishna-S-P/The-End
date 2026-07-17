import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../AuthContext';
import { setRememberDevice } from '../api';
import { loadingSplash } from '../utils/loadingSplash';
import { useScrollReveal, useMagnetic, useRipple } from '../hooks/public-motion';
import { loginSchema, ROLE_REDIRECT, type LoginForm } from './LoginTypes';
import { LoginBrandPanel } from './LoginBrandPanel';
import { LoginCredentialsForm } from './LoginCredentialsForm';
import { LoginMfaStep } from './LoginMfaStep';
import { LoginContactModal } from './LoginContactModal';
import '../styles/public-motion.css';
import '../styles/LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, login, loginWithMfa } = useAuth();

  useScrollReveal();
  useMagnetic(6);
  useRipple();

  const [isVisible,          setIsVisible]          = useState(false);
  const [isLoading,          setIsLoading]          = useState(false);
  const [stage,              setStage]              = useState<'credentials' | 'mfa'>('credentials');
  const [showPassword,       setShowPassword]       = useState(false);
  const [serverError,        setServerError]        = useState<string | null>(null);
  const [capsOn,             setCapsOn]             = useState(false);
  const [rememberDevice,     setRememberDeviceState] = useState(true);
  const [showContact,        setShowContact]        = useState(false);
  const [mfaEmail,           setMfaEmail]           = useState('');
  const [mfaPassword,        setMfaPassword]        = useState('');
  const [totpCode,           setTotpCode]           = useState('');

  const reason = searchParams.get('reason');
  const hasRedirected = useRef(false);

  useEffect(() => { requestAnimationFrame(() => setIsVisible(true)); }, []);

  useEffect(() => {
    if (isAuthenticated && user && !hasRedirected.current) {
      hasRedirected.current = true;
      const rawRole = user.roles?.[0]?.name || '';
      navigate(ROLE_REDIRECT[rawRole] || '/app/dashboard', { replace: true });
    }
  }, [isAuthenticated, user]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmitCredentials = async (formData: LoginForm) => {
    setIsLoading(true);
    setServerError(null);
    setRememberDevice(rememberDevice);
    loadingSplash.show(0);
    try {
      const result = await login({ email: formData.email, password: formData.password });
      if (result.mfaRequired) {
        loadingSplash.hide();
        setMfaEmail(formData.email);
        setMfaPassword(formData.password);
        setStage('mfa');
        return;
      }
    } catch (err: any) {
      loadingSplash.hide();
      const status = err?.response?.status;
      const msg: string = err?.response?.data?.message ?? '';
      const retryAfterSeconds: number = err?.response?.data?.retryAfterSeconds ?? 0;
      if (status === 403 && /mfa enrollment is required/i.test(msg)) {
        setServerError('This account requires MFA before sign-in. Ask your platform admin to enrol you, or sign in once with MFA enforcement disabled to set up MFA from Settings → MFA.');
      } else if (status === 403 && retryAfterSeconds > 0) {
        setServerError(`Account locked. Try again in ${retryAfterSeconds} seconds.`);
      } else if (status === 401 || status === 403) {
        setServerError(msg || 'Invalid email or password. Please try again.');
      } else if (status === 429) {
        setServerError(retryAfterSeconds > 0
          ? `Too many login attempts. Please wait ${retryAfterSeconds} seconds.`
          : 'Too many login attempts. Please wait a few minutes.');
      } else {
        setServerError(msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitMfa = async () => {
    if (totpCode.length < 6) { setServerError('Please enter the complete 6-digit code.'); return; }
    setIsLoading(true);
    setServerError(null);
    setRememberDevice(rememberDevice);
    loadingSplash.show(0);
    try {
      await loginWithMfa(mfaEmail, mfaPassword, totpCode);
    } catch (err: any) {
      loadingSplash.hide();
      const status = err?.response?.status;
      if (status === 401 || status === 400) {
        setServerError('Invalid authenticator code. Please check your app and try again.');
        setTotpCode('');
      } else {
        setServerError('Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signin-page" style={{ opacity: isVisible ? 1 : 0, transition: 'opacity 300ms ease-out' }}>
      <main className="page" role="main">
        <LoginBrandPanel />

        <section className="right" aria-label="Sign in">
          <div className={`form-wrap${stage === 'mfa' ? ' is-mfa' : ''}`}>
            {stage === 'credentials' && (
              <LoginCredentialsForm
                register={register}
                errors={errors}
                onSubmit={e => handleSubmit(onSubmitCredentials, () => loadingSplash.hide())(e)}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                setCapsOn={setCapsOn}
                capsOn={capsOn}
                rememberDevice={rememberDevice}
                setRememberDeviceState={setRememberDeviceState}
                serverError={serverError}
                reason={reason}
                isLoading={isLoading}
                setShowContact={setShowContact}
              />
            )}
            {stage === 'mfa' && (
              <LoginMfaStep
                mfaEmail={mfaEmail}
                serverError={serverError}
                totpCode={totpCode}
                setTotpCode={setTotpCode}
                isLoading={isLoading}
                onSubmitMfa={onSubmitMfa}
                onBack={() => { setStage('credentials'); setServerError(null); setTotpCode(''); }}
              />
            )}
          </div>
        </section>
      </main>

      {showContact && <LoginContactModal onClose={() => setShowContact(false)} />}
    </div>
  );
}
