import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Mic, Paperclip, Square } from 'lucide-react';

const MAX_CHARS = 2000;
const COUNTER_AT = 1600; // only surface the counter once it starts to matter

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  /** Reply in flight — the send control becomes Stop. */
  busy: boolean;
  disabled: boolean;
  placeholder: string;
  /** Raised when a control has no backend yet, so the panel can explain itself. */
  onUnavailable: (what: string) => void;
}

export const LucienComposer = React.forwardRef<HTMLTextAreaElement, Props>(function LucienComposer(
  { value, onChange, onSend, onStop, busy, disabled, placeholder, onUnavailable }, ref,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  const [focused, setFocused] = useState(false);

  const setRefs = useCallback((el: HTMLTextAreaElement | null) => {
    innerRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
  }, [ref]);

  // Grow with content up to a ceiling, then scroll inside the field.
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, 168)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !disabled && !busy;
  const remaining = MAX_CHARS - value.length;

  return (
    <div className="lucien-composer-wrap">
      <div className={`lucien-composer${focused ? ' is-focused' : ''}${disabled ? ' is-disabled' : ''}`}>
        <button type="button" className="lucien-composer-tool"
          onClick={() => onUnavailable('Attachments')}
          aria-label="Attach a file" title="Attach a file">
          <Paperclip size={16} aria-hidden="true" />
        </button>

        <textarea
          ref={setRefs}
          className="lucien-composer-area"
          value={value}
          rows={1}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={e => onChange(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
        />

        <div className="lucien-composer-right">
          {remaining <= MAX_CHARS - COUNTER_AT && (
            <span className={`lucien-composer-count${remaining <= 0 ? ' is-max' : ''}`}>{remaining}</span>
          )}
          <button type="button" className="lucien-composer-tool"
            onClick={() => onUnavailable('Voice input')}
            aria-label="Dictate a message" title="Dictate a message">
            <Mic size={16} aria-hidden="true" />
          </button>
          {busy ? (
            <button type="button" className="lucien-composer-send is-stop" onClick={onStop}
              aria-label="Stop generating" title="Stop generating">
              <Square size={12} fill="currentColor" aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className="lucien-composer-send" onClick={onSend} disabled={!canSend}
              aria-label="Send message" title="Send">
              <ArrowUp size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
});
