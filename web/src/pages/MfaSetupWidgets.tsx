import { useRef, Fragment } from 'react';
import type { KeyboardEvent, ClipboardEvent } from 'react';
import { Check } from 'lucide-react';

export function OtpBoxes({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const cur = (value + '      ').split('').slice(0, 6);
    cur[i] = digit;
    onChange(cur.join('').replace(/ /g, '').slice(0, digit ? i + 1 : i));
    if (digit && i < 5) setTimeout(() => inputs.current[i + 1]?.focus(), 10);
  };

  const handleKeyDown = (i: number, e: KeyboardEvent) => {
    if (e.key === 'Backspace') {
      onChange(value.slice(0, i));
      if (i > 0) setTimeout(() => inputs.current[i - 1]?.focus(), 10);
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p) { onChange(p); setTimeout(() => inputs.current[Math.min(p.length, 5)]?.focus(), 10); }
    e.preventDefault();
  };

  return (
    <div className="otp-row">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="otp-box"
        />
      ))}
    </div>
  );
}

export function Steps({ current }: { current: 1 | 2 | 3 | 4 }) {
  const steps = [
    { n: 1, label: 'Scan QR' },
    { n: 2, label: 'Verify' },
    { n: 3, label: 'Save codes' },
  ];
  return (
    <div className="mfa-steps" aria-label="Setup progress">
      {steps.map((s, idx) => {
        const isActive = current === s.n;
        const isDone = current > s.n;
        return (
          <Fragment key={s.n}>
            <div className={`mfa-step${isActive ? ' is-active' : ''}${isDone ? ' is-done' : ''}`}>
              <div className="mfa-step-badge">
                {isDone ? <Check size={13} /> : String(s.n).padStart(2, '0')}
              </div>
              <span className="mfa-step-label">{s.label}</span>
            </div>
            {idx < steps.length - 1 && <div className="mfa-step-divider" aria-hidden="true" />}
          </Fragment>
        );
      })}
    </div>
  );
}
