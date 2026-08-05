import { useRef } from 'react';
import type { KeyboardEvent, ClipboardEvent } from 'react';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';

export const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  otp: z.string().min(1, 'OTP is required').regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[@$!%*?&]/, 'Must contain at least one special character (@$!%*?&)'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type FormValues = z.infer<typeof schema>;

export function OtpBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const cur = (value + '      ').split('').slice(0, 6);
    cur[i] = digit;
    onChange(cur.join('').replace(/ /g, ''));
    if (digit && i < 5) setTimeout(() => inputs.current[i + 1]?.focus(), 10);
  };

  const handleKeyDown = (i: number, e: KeyboardEvent) => {
    if (e.key === 'Backspace') {
      const cur = (value + '      ').split('').slice(0, 6);
      cur[i] = '';
      onChange(cur.join('').replace(/ /g, '').slice(0, i));
      if (i > 0) setTimeout(() => inputs.current[i - 1]?.focus(), 10);
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) { onChange(pasted); setTimeout(() => inputs.current[Math.min(pasted.length, 5)]?.focus(), 10); }
    e.preventDefault();
  };

  return (
    <div className="otp-row">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text" inputMode="numeric" maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="otp-box"
        />
      ))}
    </div>
  );
}

export function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters',      pass: password.length >= 8 },
    { label: 'Uppercase letter',   pass: /[A-Z]/.test(password) },
    { label: 'Number',             pass: /[0-9]/.test(password) },
    { label: 'Special (@$!%*?&)', pass: /[@$!%*?&]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  if (!password) return null;

  /* Dynamic colours — score/pass driven, must stay in JS.
     #84CC16 (lime) has no design-system token yet; flagged in Phase 3. */
  const segColor = (
    ['var(--rp-error)', 'var(--rp-warn-border)', '#84CC16', 'var(--rp-success)']
  )[score - 1] ?? 'var(--border)';
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="rp-strength">
      <div className="rp-strength-bar">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rp-strength-seg"
            style={{ background: i < score ? segColor : undefined }}
          />
        ))}
        <span className="rp-strength-label" style={{ color: segColor }}>
          {labels[score - 1] ?? ''}
        </span>
      </div>
      <div className="rp-strength-checks">
        {checks.map((c) => (
          <span
            key={c.label}
            className="rp-strength-check"
            style={{ color: c.pass ? 'var(--rp-success)' : 'var(--ink-tertiary)' }}
          >
            <CheckCircle2 size={11} /> {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export const EyeOpen = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export const EyeClosed = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2 2l12 12M6.5 5.5A4.5 4.5 0 0114.5 8s-.7 1.7-2.7 3.3M1.5 8S4 3.5 8 3.5c.8 0 1.5.2 2.2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
