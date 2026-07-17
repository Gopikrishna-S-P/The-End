import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Frown, Meh, Smile, Laugh, Send, MessageSquare, CheckCircle2,
} from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { notifications } from '../utils/notifications';
import './FeedbackDialog.css';

type Mood = 'sad' | 'meh' | 'happy' | 'love';

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  /** Optional user identifier appended to the submission payload. */
  userIdentifier?: string;
  /** Called with the structured feedback. Defaults to console.warn (stub). */
  onSubmit?: (payload: FeedbackPayload) => Promise<void> | void;
}

export interface FeedbackPayload {
  mood: Mood;
  comment: string;
  context: {
    url: string;
    userAgent: string;
    timestamp: string;
    user?: string;
  };
}

const MOODS: Array<{ id: Mood; icon: React.ElementType; label: string }> = [
  { id: 'sad',   icon: Frown, label: 'Frustrated' },
  { id: 'meh',   icon: Meh,   label: 'OK' },
  { id: 'happy', icon: Smile, label: 'Good' },
  { id: 'love',  icon: Laugh, label: 'Love it' },
];

export default function FeedbackDialog({
  open, onClose, userIdentifier, onSubmit,
}: FeedbackDialogProps) {
  const [mood, setMood] = useState<Mood | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  if (!open) return null;

  const reset = () => {
    setMood(null);
    setComment('');
    setSubmitting(false);
    setDone(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!mood) return;
    setSubmitting(true);
    const payload: FeedbackPayload = {
      mood,
      comment: comment.trim(),
      context: {
        url:       typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        timestamp: new Date().toISOString(),
        user:      userIdentifier,
      },
    };
    try {
      if (onSubmit) await onSubmit(payload);
      setDone(true);
      notifications.add({
        type: 'system',
        title: 'Feedback received',
        body:  'Thanks — we read every reply. The team will follow up if it\'s actionable.',
      });
      window.setTimeout(close, 1400);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="app-feedback-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rp-feedback-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="app-feedback-dialog" ref={dialogRef} tabIndex={-1}>
        <header className="app-feedback-header">
          <div className="app-feedback-title">
            <MessageSquare size={14} aria-hidden="true" />
            <span id="rp-feedback-title">Send feedback</span>
          </div>
          <button
            type="button"
            className="app-feedback-close"
            onClick={close}
            aria-label="Close feedback"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </header>

        {done ? (
          <div className="app-feedback-success">
            <CheckCircle2 size={36} aria-hidden="true" />
            <p className="app-feedback-success-title">Thanks for the signal.</p>
            <p className="app-feedback-success-hint">We log every reply — you can always send more.</p>
          </div>
        ) : (
          <>
            <p className="app-feedback-intro">
              How does Recoverpro feel right now? One tap + an optional note.
            </p>

            <div className="app-feedback-moods" role="radiogroup" aria-label="Mood">
              {MOODS.map(m => {
                const Icon = m.icon;
                const selected = mood === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`app-feedback-mood mood-${m.id}${selected ? ' is-selected' : ''}`}
                    onClick={() => setMood(m.id)}
                  >
                    <Icon size={26} aria-hidden="true" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            <label className="app-feedback-comment-label">
              Anything specific? <span>(optional)</span>
            </label>
            <textarea
              className="app-feedback-comment"
              placeholder="What worked? What didn't? What's missing?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={600}
              aria-label="Feedback comment"
            />
            <div className="app-feedback-charcount">{comment.length}/600</div>

            <footer className="app-feedback-footer">
              <span className="app-feedback-privacy">
                We attach the current page URL + browser info — no other data.
              </span>
              <button
                type="button"
                className="app-feedback-submit"
                onClick={submit}
                disabled={!mood || submitting}
              >
                <Send size={11} aria-hidden="true" />
                {submitting ? 'Sending…' : 'Send'}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
