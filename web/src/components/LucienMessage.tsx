import { useCallback, useState } from 'react';
import {
  Check, Copy, Pencil, RefreshCw, ShieldAlert, ThumbsDown, ThumbsUp,
} from 'lucide-react';
import { LucienMarkdown } from './LucienMarkdown';
import lucienLogo from '../assets/images/lucien-logo.png';

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt?: string;
  /** Server refused this turn on safety grounds — rendered as a notice, not a reply. */
  blocked?: boolean;
  blockReason?: string;
  modelName?: string;
}

export type Feedback = 'up' | 'down';

function timeLabel(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

interface Props {
  msg: ChatMessage;
  initials: string;
  /** Only the newest assistant reply offers regenerate. */
  isLast: boolean;
  busy: boolean;
  feedback?: Feedback;
  onFeedback: (id: string, value: Feedback) => void;
  onRegenerate: () => void;
  onEdit: (id: string, next: string) => void;
}

export function LucienMessage({
  msg, initials, isLast, busy, feedback, onFeedback, onRegenerate, onEdit,
}: Props) {
  const [copied, setCopied]   = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(msg.content);

  const isUser = msg.role === 'USER';

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(msg.content)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {/* clipboard blocked — text is still selectable */});
  }, [msg.content]);

  const commitEdit = () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== msg.content) onEdit(msg.id, next);
    else setDraft(msg.content);
  };

  if (msg.blocked) {
    return (
      <div className="lucien-row lucien-row--bot">
        <span className="lucien-avatar lucien-avatar--bot" aria-hidden="true">
          <img src={lucienLogo} alt="" />
        </span>
        <div className="lucien-row-main">
          <div className="lucien-blocked" role="note">
            <ShieldAlert size={14} aria-hidden="true" />
            <div>
              <span className="lucien-blocked-title">Lucien held this one back</span>
              <span className="lucien-blocked-sub">
                {msg.blockReason || 'The request fell outside what Lucien is allowed to answer.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`lucien-row lucien-row--${isUser ? 'user' : 'bot'}`}>
      <span className={`lucien-avatar lucien-avatar--${isUser ? 'user' : 'bot'}`} aria-hidden="true">
        {isUser ? initials : <img src={lucienLogo} alt="" />}
      </span>

      <div className="lucien-row-main">
        <div className="lucien-row-meta">
          <span className="lucien-row-who">{isUser ? 'You' : 'Lucien'}</span>
          <span className="lucien-row-time">{timeLabel(msg.createdAt)}</span>
          {!isUser && msg.modelName && (
            <span className="lucien-row-model">{msg.modelName}</span>
          )}
        </div>

        {editing ? (
          <div className="lucien-edit">
            <textarea
              className="lucien-edit-area"
              value={draft}
              autoFocus
              rows={3}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
                if (e.key === 'Escape') { setEditing(false); setDraft(msg.content); }
              }}
            />
            <div className="lucien-edit-actions">
              <button type="button" className="lucien-edit-btn is-primary" onClick={commitEdit}>
                Send again
              </button>
              <button type="button" className="lucien-edit-btn"
                onClick={() => { setEditing(false); setDraft(msg.content); }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={`lucien-bubble lucien-bubble--${isUser ? 'user' : 'bot'}`}>
            {isUser ? msg.content : <LucienMarkdown text={msg.content} />}
          </div>
        )}

        {!editing && (
          <div className="lucien-actions">
            <button type="button" className="lucien-action" onClick={copy}
              title={copied ? 'Copied' : 'Copy'} aria-label={copied ? 'Copied' : 'Copy message'}>
              {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
            </button>

            {isUser ? (
              <button type="button" className="lucien-action" disabled={busy}
                onClick={() => { setDraft(msg.content); setEditing(true); }}
                title="Edit and resend" aria-label="Edit and resend">
                <Pencil size={13} aria-hidden="true" />
              </button>
            ) : (
              <>
                {isLast && (
                  <button type="button" className="lucien-action" onClick={onRegenerate} disabled={busy}
                    title="Regenerate reply" aria-label="Regenerate reply">
                    <RefreshCw size={13} aria-hidden="true" />
                  </button>
                )}
                <span className="lucien-action-div" aria-hidden="true" />
                <button type="button"
                  className={`lucien-action${feedback === 'up' ? ' is-on' : ''}`}
                  onClick={() => onFeedback(msg.id, 'up')}
                  title="Good reply" aria-label="Good reply" aria-pressed={feedback === 'up'}>
                  <ThumbsUp size={13} aria-hidden="true" />
                </button>
                <button type="button"
                  className={`lucien-action${feedback === 'down' ? ' is-on is-down' : ''}`}
                  onClick={() => onFeedback(msg.id, 'down')}
                  title="Bad reply" aria-label="Bad reply" aria-pressed={feedback === 'down'}>
                  <ThumbsDown size={13} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

