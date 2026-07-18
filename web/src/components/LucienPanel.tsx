import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Send, X, Plus, Loader2, AlertCircle, RefreshCw, ShieldAlert, Check } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { lucienApi } from '../api/lucienApi';
import lucienLogo from '../assets/images/lucien-logo.png';
import './LucienPanel.css';

interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
}

interface PendingConfirm {
  actionId: string;
  summary: string;
  toolName?: string;
}

interface LucienPanelProps {
  open: boolean;
  onClose: () => void;
}

const MAX_CHARS = 2000;
const SEND_DEBOUNCE_MS = 100;
const HISTORY_KEY = 'lucien-chat-history';
const MAX_HISTORY = 60;

const SAMPLE_PROMPTS = [
  'How do I approach a borrower who avoids calls?',
  'Draft a follow-up for a broken PTP.',
  'What should I say when a borrower claims hardship?',
];

function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, j) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={j}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={j} className="lucien-md-code-inline">{p.slice(1, -1)}</code>;
    return <React.Fragment key={j}>{p}</React.Fragment>;
  });
}

function renderText(text: string): React.ReactNode {
  const segments: React.ReactNode[] = [];
  const blocks = text.split(/(```[\s\S]*?```)/g);
  blocks.forEach((block, bi) => {
    if (block.startsWith('```')) {
      const code = block.replace(/^```\w*\n?/, '').replace(/```$/, '').trim();
      segments.push(<pre key={`b${bi}`} className="lucien-md-block"><code>{code}</code></pre>);
      return;
    }
    block.split('\n').forEach((line, li) => {
      const trimmed = line.trim();
      const isBullet   = /^[-*•]\s+/.test(trimmed);
      const isNumbered = /^\d+\.\s+/.test(trimmed);
      const isHeading  = /^#{1,3}\s+/.test(trimmed);
      const body = isBullet   ? trimmed.replace(/^[-*•]\s+/, '')
                 : isNumbered ? trimmed.replace(/^\d+\.\s+/, '')
                 : isHeading  ? trimmed.replace(/^#{1,3}\s+/, '')
                 : line;
      const inline = renderInline(body);
      const key = `${bi}-${li}`;
      if (isBullet)   { segments.push(<div key={key} className="lucien-md-li">{inline}</div>); return; }
      if (isNumbered) { segments.push(<div key={key} className="lucien-md-li lucien-md-li--num">{trimmed.match(/^(\d+)/)?.[1]}. {inline}</div>); return; }
      if (isHeading)  { segments.push(<div key={key} className="lucien-md-h">{inline}</div>); return; }
      if (trimmed === '') { segments.push(<div key={key} className="lucien-md-gap" aria-hidden="true" />); return; }
      segments.push(<div key={key} className="lucien-md-p">{inline}</div>);
    });
  });
  return segments;
}

export default function LucienPanel({ open, onClose }: LucienPanelProps) {
  const { user } = useAuth();
  const agentId = user?.agentId || user?.id || '';
  const agentFirstName = user?.firstName || 'Agent';

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages,  setMessages]  = useState<ChatMessage[]>(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); } catch { return []; }
  });
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [starting,  setStarting]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [confirming, setConfirming] = useState(false);

  const panelRef    = useRef<HTMLElement>(null);
  const listRef     = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const lastSentRef = useRef(0);
  const startingRef = useRef(false);

  // Persist chat history
  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_HISTORY))); } catch {}
  }, [messages]);

  // inert when closed; clear error so next open gets a fresh start attempt
  useEffect(() => {
    panelRef.current?.toggleAttribute('inert', !open);
    if (!open) setError(null);
  }, [open]);

  // auto-grow textarea
  const autoGrow = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, 132)}px`;
  }, []);
  useEffect(() => { autoGrow(); }, [input, open, autoGrow]);

  // scroll to bottom on new messages
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  // focus input when opened
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 260);
    return () => window.clearTimeout(id);
  }, [open]);

  // Escape closes the panel
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const startSession = useCallback(async () => {
    if (startingRef.current) return; // prevent double-start
    if (!agentId) {
      setError('No agent profile linked — Lucien cannot start.');
      return;
    }
    startingRef.current = true;
    setStarting(true);
    setError(null);
    try {
      const session = await lucienApi.startSession({ agentId, agentFirstName });
      setSessionId(session.sessionId);
      setMessages([]);
      setPendingConfirm(null);
    } catch {
      setError('Lucien is unavailable right now. Please try again.');
    } finally {
      setStarting(false);
      startingRef.current = false;
    }
  }, [agentId, agentFirstName]);

  // start a session when panel opens, but only once
  useEffect(() => {
    if (open && !sessionId && !startingRef.current && !error) {
      startSession();
    }
  }, [open, sessionId, error, startSession]);

  const send = useCallback(async (text?: string) => {
    const raw = (text ?? input).trim();
    if (!raw || !sessionId || sending || pendingConfirm) return;
    const now = Date.now();
    if (now - lastSentRef.current < SEND_DEBOUNCE_MS) return;
    lastSentRef.current = now;

    const userMsg: ChatMessage = { id: `u-${now}`, role: 'USER', content: raw };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setError(null);
    try {
      const resp = await lucienApi.sendMessage({ sessionId, message: raw });
      setMessages(prev => [...prev, {
        id: resp.messageId ?? `a-${Date.now()}`,
        role: 'ASSISTANT',
        content: resp.reply || 'Lucien had nothing to add.',
      }]);
      if (resp.confirmationRequired && resp.pendingActionId) {
        setPendingConfirm({
          actionId: resp.pendingActionId,
          summary: resp.pendingActionSummary || 'Lucien wants to perform an action on your behalf.',
          toolName: resp.pendingToolName,
        });
      }
    } catch {
      setError('error');
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
      setInput(raw);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sessionId, sending, pendingConfirm]);

  const handleConfirmAction = useCallback(async (confirmed: boolean) => {
    if (!sessionId || !pendingConfirm) return;
    setConfirming(true);
    try {
      const resp = await lucienApi.confirmAction(sessionId, { actionId: pendingConfirm.actionId, confirmed });
      setMessages(prev => [...prev, {
        id: resp.messageId ?? `a-${Date.now()}`,
        role: 'ASSISTANT',
        content: resp.reply || (confirmed ? 'Action executed.' : 'Action cancelled.'),
      }]);
    } catch {
      setError('error');
    } finally {
      setPendingConfirm(null);
      setConfirming(false);
      inputRef.current?.focus();
    }
  }, [sessionId, pendingConfirm]);

  const newChat = useCallback(async () => {
    if (startingRef.current) return;
    const prevSession = sessionId;
    // reset state first
    setSessionId(null);
    setMessages([]);
    setInput('');
    setError(null);
    setPendingConfirm(null);
    // fire-and-forget close of old session — keeps it in history, does NOT erase it
    if (prevSession) {
      lucienApi.closeSession(prevSession).catch(() => {/* ok */});
    }
    // start a fresh session (startingRef guard prevents the effect from racing)
    await startSession();
  }, [sessionId, startSession]);

  const canSend = input.trim().length > 0 && !!sessionId && !sending && !pendingConfirm;
  const isReady = !!sessionId && !starting;

  return (
    <aside
      ref={panelRef}
      className={`lucien-panel${open ? ' is-open' : ''}`}
      aria-label="Lucien AI assistant"
    >
      <div className="lucien-panel-inner">

        <header className="lucien-panel-head">
          <span className="lucien-panel-title">
            <img src={lucienLogo} alt="" aria-hidden="true" className="lucien-panel-logo" />
            Lucien AI
          </span>
          <div className="lucien-panel-head-actions">
            <button
              type="button"
              className="lucien-panel-icon-btn"
              onClick={newChat}
              disabled={starting}
              aria-label="New conversation"
              title="New conversation"
            >
              <Plus size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="lucien-panel-icon-btn"
              onClick={onClose}
              aria-label="Close Lucien"
              title="Close"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="lucien-panel-error" role="alert">
            <AlertCircle size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
            <div className="lucien-panel-error-body">
              <span className="lucien-panel-error-title">Lucien did not respond.</span>
              <span className="lucien-panel-error-sub">Please try again or start a new chat.</span>
            </div>
            <button
              type="button"
              className="lucien-panel-retry"
              onClick={() => {
                setError(null);
                if (!sessionId) startSession();
              }}
              aria-label="Retry"
            >
              <RefreshCw size={14} aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="lucien-panel-body" ref={listRef}>
          {/* Empty state */}
          {messages.length === 0 && isReady && !error && (
            <div className="lucien-panel-empty">
              <span className="lucien-panel-empty-mark"><Sparkles size={22} aria-hidden="true" /></span>
              <p className="lucien-panel-empty-title">Hi {agentFirstName} — how can I help?</p>
              <p className="lucien-panel-empty-sub">
                Ask about collections strategy, call scripts, or a tricky borrower.
              </p>
              <div className="lucien-panel-prompts">
                {SAMPLE_PROMPTS.map(p => (
                  <button
                    key={p}
                    type="button"
                    className="lucien-panel-prompt"
                    onClick={() => send(p)}
                    disabled={sending}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {starting && messages.length === 0 && (
            <div className="lucien-panel-status">
              <Loader2 size={15} className="lucien-spin" aria-hidden="true" /> Starting Lucien…
            </div>
          )}

          {/* Messages */}
          {messages.map(m => (
            <div key={m.id} className={`lucien-msg lucien-msg--${m.role === 'USER' ? 'user' : 'bot'}`}>
              {m.role === 'ASSISTANT' ? renderText(m.content) : m.content}
            </div>
          ))}

          {/* Typing indicator */}
          {sending && (
            <div className="lucien-msg lucien-msg--bot lucien-msg--typing" aria-label="Lucien is typing">
              <span className="lucien-dot" />
              <span className="lucien-dot" />
              <span className="lucien-dot" />
            </div>
          )}
        </div>

        {/* Pending WRITE-action confirmation */}
        {pendingConfirm && (
          <div className="lucien-panel-confirm" role="alert">
            <ShieldAlert size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
            <div className="lucien-panel-confirm-body">
              <span className="lucien-panel-confirm-title">
                Confirmation required{pendingConfirm.toolName ? ` — ${pendingConfirm.toolName}` : ''}
              </span>
              <span className="lucien-panel-confirm-sub">{pendingConfirm.summary}</span>
              <div className="lucien-panel-confirm-actions">
                <button type="button" className="lucien-panel-confirm-btn is-confirm" onClick={() => handleConfirmAction(true)} disabled={confirming}>
                  {confirming ? <Loader2 size={12} className="lucien-spin" aria-hidden="true" /> : <Check size={12} aria-hidden="true" />} Confirm
                </button>
                <button type="button" className="lucien-panel-confirm-btn" onClick={() => handleConfirmAction(false)} disabled={confirming}>
                  <X size={12} aria-hidden="true" /> Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="lucien-panel-composer">
          <textarea
            ref={inputRef}
            className="lucien-panel-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder={pendingConfirm ? 'Resolve the pending confirmation above…' : isReady ? 'Ask Lucien…' : 'Connecting…'}
            rows={1}
            disabled={!isReady || sending || !!pendingConfirm}
          />
          <div className="lucien-panel-composer-row">
            <button
              type="button"
              className="lucien-panel-send"
              onClick={() => send()}
              disabled={!canSend}
              aria-label="Send message"
            >
              {sending
                ? <Loader2 size={13} className="lucien-spin" aria-hidden="true" />
                : <Send size={13} aria-hidden="true" />}
            </button>
          </div>
        </div>

      </div>
    </aside>
  );
}
