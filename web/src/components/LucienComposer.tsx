import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AudioLines, Plus, SendHorizontal, Square } from 'lucide-react';
import { isSpeechRecognitionSupported, startDictation, stopSpeaking } from '../utils/speech';
import type { VoiceLang } from '../api/lucienApi';

const MAX_CHARS = 2000;
const COUNTER_AT = 1600; // only surface the counter once it starts to matter

/** BCP-47 dictation locale for each voice language — also drives what the mic understands. */
const DICTATION_LOCALE: Record<VoiceLang, string> = {
  en: '', // '' -> startDictation falls back to navigator.language
  hi: 'hi-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
  te: 'te-IN',
};

const VOICE_LANG_OPTIONS: { value: VoiceLang; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'hi', label: 'हिं' },
  { value: 'ta', label: 'தமி' },
  { value: 'kn', label: 'ಕನ್ನ' },
  { value: 'te', label: 'తెలు' },
];

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
  /** Language used both for spoken replies and for dictation's recognition locale. */
  voiceLang: VoiceLang;
  onVoiceLangChange: (lang: VoiceLang) => void;
}

export const LucienComposer = React.forwardRef<HTMLTextAreaElement, Props>(function LucienComposer(
  { value, onChange, onSend, onStop, busy, disabled, placeholder, onUnavailable, voiceLang, onVoiceLangChange }, ref,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  const [focused, setFocused] = useState(false);
  const [listening, setListening] = useState(false);
  const stopDictationRef = useRef<(() => void) | null>(null);
  const dictationBaseRef = useRef('');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const stopDictation = useCallback(() => {
    stopDictationRef.current?.();
    stopDictationRef.current = null;
    setListening(false);
  }, []);

  // Stop a live mic session if the composer becomes unusable (reply completes
  // and clears the field, session ends, etc.) so it doesn't keep listening
  // into a control the user can no longer see is active.
  useEffect(() => () => stopDictationRef.current?.(), []);

  const toggleDictation = useCallback(() => {
    if (listening) {
      stopDictation();
      return;
    }
    if (!isSpeechRecognitionSupported()) {
      onUnavailable('Voice input');
      return;
    }
    stopSpeaking(); // don't let Lucien talk over the user
    dictationBaseRef.current = value ? value + ' ' : '';
    const stop = startDictation(
      (transcript) => onChangeRef.current((dictationBaseRef.current + transcript).slice(0, MAX_CHARS)),
      () => { stopDictationRef.current = null; setListening(false); },
      DICTATION_LOCALE[voiceLang] || undefined,
    );
    if (!stop) {
      onUnavailable('Voice input');
      return;
    }
    stopDictationRef.current = stop;
    setListening(true);
  }, [listening, onUnavailable, stopDictation, value, voiceLang]);

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

  const handleSend = useCallback(() => {
    if (listening) stopDictation();
    onSend();
  }, [listening, onSend, stopDictation]);

  return (
    <div className="lucien-composer-wrap">
      {listening && (
        <div className="lucien-listening-badge" role="status">
          <span className="lucien-listening-dot" aria-hidden="true" />
          Listening…
        </div>
      )}
      <div className={`lucien-composer${focused ? ' is-focused' : ''}${disabled ? ' is-disabled' : ''}`}>
        <button type="button" className="lucien-composer-tool"
          onClick={() => onUnavailable('Attachments')}
          aria-label="Attach a file" title="Attach a file">
          <Plus size={17} aria-hidden="true" />
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
              if (canSend) handleSend();
            }
          }}
        />

        <div className="lucien-composer-right">
          {remaining <= MAX_CHARS - COUNTER_AT && (
            <span className={`lucien-composer-count${remaining <= 0 ? ' is-max' : ''}`}>{remaining}</span>
          )}
          <select
            className="lucien-voice-lang-select"
            value={voiceLang}
            onChange={e => onVoiceLangChange(e.target.value as VoiceLang)}
            aria-label="Voice language (spoken replies and dictation)"
            title="Voice language"
          >
            {VOICE_LANG_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button type="button" className={`lucien-composer-tool${listening ? ' is-listening' : ''}`}
            onClick={toggleDictation}
            aria-label={listening ? 'Stop dictation' : 'Dictate a message'}
            aria-pressed={listening}
            title={listening ? 'Stop dictation' : 'Dictate a message'}>
            <AudioLines size={16} aria-hidden="true" />
          </button>
          {busy ? (
            <button type="button" className="lucien-composer-send is-stop" onClick={onStop}
              aria-label="Stop generating" title="Stop generating">
              <Square size={12} fill="currentColor" aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className="lucien-composer-send" onClick={handleSend} disabled={!canSend}
              aria-label="Send message" title="Send">
              <SendHorizontal size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
});
