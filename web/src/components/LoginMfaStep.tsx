import { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function LoginMfaStep({ onComplete }: { onComplete: () => void }) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [timer, setTimer] = useState(60);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (timer > 0) {
      const id = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(id);
    }
  }, [timer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (/[^0-9]/.test(val)) return;

    const newCode = [...code];
    newCode[index] = val;
    setCode(newCode);

    if (val && index < 5) {
      inputs.current[index + 1]?.focus();
    } else if (newCode.every(c => c !== '')) {
      handleSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (fullCode: string) => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onComplete();
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <p style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
        We've sent a 6-digit code to your registered device. Enter it below to continue.
      </p>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        {code.map((digit, i) => (
          <input
            key={i}
            ref={el => { inputs.current[i] = el; }}
            type="text"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(e, i)}
            onKeyDown={e => handleKeyDown(e, i)}
            style={{
              width: 44, height: 50, textAlign: 'center', fontSize: 20, fontWeight: 600,
              border: '1.5px solid var(--border)', borderRadius: 12, outline: 'none',
              transition: 'border-color 150ms'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--ink-solid)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        ))}
      </div>

      <button className="app-page-btn app-page-btn-primary" style={{ width: '100%', height: 44, fontSize: 14 }}
        disabled={submitting || code.some(c => !c)}>
        {submitting ? <RefreshCw size={15} className="app-page-spinner-icon" /> : 'Verify Code'}
      </button>

      <div style={{ textAlign: 'center' }}>
        <button className="app-page-btn app-page-btn-ghost" disabled={timer > 0} onClick={() => setTimer(60)} style={{ fontSize: 13, height: 'auto', padding: 0 }}>
          {timer > 0 ? `Resend code (${timer}s)` : 'Resend code'}
        </button>
      </div>
    </div>
  );
}
