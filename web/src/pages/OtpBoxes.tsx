import React, { useRef } from 'react';

interface OtpBoxesProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function OtpBoxes({ value, onChange, disabled }: OtpBoxesProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const cur = (value + '      ').split('').slice(0, 6);
    cur[i] = digit;
    onChange(cur.join('').replace(/ /g, ''));
    if (digit && i < 5) setTimeout(() => inputs.current[i + 1]?.focus(), 10);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      onChange(value.slice(0, i));
      if (i > 0) setTimeout(() => inputs.current[i - 1]?.focus(), 10);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p) { onChange(p); setTimeout(() => inputs.current[Math.min(p.length, 5)]?.focus(), 10); }
    e.preventDefault();
  };

  return (
    <div className="otp-row">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="otp-box"
        />
      ))}
    </div>
  );
}
