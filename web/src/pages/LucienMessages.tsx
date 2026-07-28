import type { RefObject } from 'react';
import { Bot, Loader2, ShieldAlert } from 'lucide-react';
import { renderMarkdown, SAMPLE_PROMPTS, type ChatMessage } from './LucienHelpers';

interface Props {
  messages: ChatMessage[];
  sending: boolean;
  starting: boolean;
  loadingHistory: boolean;
  error: string | null;
  agentFirstName: string;
  bottomRef: RefObject<HTMLDivElement>;
  onSendSample: (text: string) => void;
}

export function LucienMessages({ messages, sending, starting, loadingHistory, error, agentFirstName, bottomRef, onSendSample }: Props) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: messages.length > 0 || sending ? 'auto' : 'hidden', padding: messages.length > 0 || sending ? '20px 24px' : '0', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {messages.length === 0 && !starting && !loadingHistory && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 0, padding: '0 24px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', marginBottom: 12,
          }}>
            <Bot size={24} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600, color: 'var(--ink-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
            Hi {agentFirstName}, I'm <em>Lucien.</em>
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ink-secondary)', maxWidth: 320, marginBottom: 20, lineHeight: 1.5 }}>
            Your AI assistant for loan recovery. Ask me anything about negotiation, case strategy, or borrower communication.
          </p>
          <div className="ds-label" style={{ marginBottom: 8, color: 'var(--ink-tertiary)' }}>Try asking…</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 6, maxWidth: 460, width: '100%' }}>
            {SAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onSendSample(p)}
                style={{
                  textAlign: 'left', padding: '9px 13px',
                  border: '1px solid var(--border)', borderRadius: 9,
                  background: 'var(--bg-surface)', fontSize: 12, color: 'var(--ink-secondary)',
                  cursor: 'pointer', fontFamily: 'var(--sans)', lineHeight: 1.4,
                  transition: 'border-color 150ms, background 150ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-surface)'; }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {starting && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--ink-tertiary)', gap: 8 }}>
          <Loader2 size={14} className="ds-spin" /> Connecting to Lucien…
        </div>
      )}

      {messages.map((msg, idx) => (
        <div
          key={msg.id}
          style={{
            display: 'flex',
            justifyContent: msg.role === 'USER' ? 'flex-end' : 'flex-start',
            animation: 'lucien-msg-in 220ms cubic-bezier(0.16,1,0.3,1) both',
            animationDelay: `${Math.min(idx, 3) * 30}ms`,
          }}
        >
          {msg.role === 'ASSISTANT' && (
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: 'var(--ink-solid)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-on-solid)', marginRight: 10, marginTop: 4,
            }}>
              <Bot size={14} />
            </div>
          )}
          <div style={{
            maxWidth: '75%', padding: '12px 16px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.6,
            ...(msg.role === 'USER'
              ? { background: 'var(--ink-solid)', color: 'var(--text-on-solid)', borderBottomRightRadius: 4 }
              : { background: 'var(--bg-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderBottomLeftRadius: 4 }),
          }}>
            {msg.blocked ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <ShieldAlert size={14} style={{ marginTop: 2, flexShrink: 0, color: 'var(--warning)' }} />
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>Lucien held this one back</div>
                  <div style={{ color: 'var(--ink-secondary)' }}>{msg.blockReason || 'The request fell outside what Lucien is allowed to answer.'}</div>
                </div>
              </div>
            ) : msg.role === 'ASSISTANT' ? renderMarkdown(msg.content) : <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>}
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, marginTop: 8, letterSpacing: '0.04em', color: msg.role === 'USER' ? 'rgba(255,255,255,0.65)' : 'var(--ink-tertiary)' }}>
              {new Date(msg.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      ))}

      {sending && (
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--ink-solid)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-on-solid)', marginRight: 10, marginTop: 4, flexShrink: 0 }}>
            <Bot size={14} />
          </div>
          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 12, borderBottomLeftRadius: 4, padding: '12px 16px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--ink-secondary)', animation: 'lu-bounce 1.4s ease-in-out infinite', animationDelay: '0ms' }} />
            <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--ink-secondary)', animation: 'lu-bounce 1.4s ease-in-out infinite', animationDelay: '150ms' }} />
            <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--ink-secondary)', animation: 'lu-bounce 1.4s ease-in-out infinite', animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
