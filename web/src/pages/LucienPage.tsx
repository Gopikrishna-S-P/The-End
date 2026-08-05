import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { lucienApi } from '../api/lucienApi';
import { extractApiError } from '../utils/extractApiError';
import { History, Plus, Send, Loader2, ShieldAlert, Check, X } from 'lucide-react';
import { type ChatMessage, type Session } from './LucienHelpers';
import { LucienHistoryPanel } from './LucienHistoryPanel';
import { LucienMessages } from './LucienMessages';
import '../styles/AppPage.css';
import './Dashboard.css';

interface PendingConfirm {
  actionId: string;
  summary: string;
  toolName?: string;
}

export default function LucienPage() {
  const { user } = useAuth();
  const agentId = user?.agentId || user?.id || '';
  const agentFirstName = user?.firstName || 'Agent';

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [confirming, setConfirming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastSentAtRef = useRef<number>(0);
  const SEND_DEBOUNCE_MS = 600;
  const MAX_CHARS = 1000;

  const maskPhoneNumbers = (text: string) =>
    text.replace(/\b[6-9]\d{9}\b/g, '[phone]').replace(/\b\d{12}\b/g, '[id]');

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, pendingConfirm]);

  const startSession = useCallback(async () => {
    if (!agentId) return;
    setStarting(true); setError(null);
    try {
      const session = await lucienApi.startSession({ agentId, agentFirstName });
      setSessionId(session.sessionId); setMessages([]); setPendingConfirm(null);
    } catch (e) {
      console.error('Lucien startSession failed', e);
      setError(extractApiError(e, 'Lucien is unavailable right now. Please try again shortly.'));
    }
    finally { setStarting(false); }
  }, [agentId, agentFirstName]);

  useEffect(() => { startSession(); }, [startSession]);

  const loadSessionHistory = async (sid: string) => {
    setLoadingHistory(true); setError(null);
    try {
      const raw = await lucienApi.getSessionHistory(sid);
      const msgs: ChatMessage[] = raw.map((m) => ({ id: m.id, role: m.role, content: m.content, createdAt: m.createdAt }));
      setMessages(msgs); setSessionId(sid); setShowHistory(false); setPendingConfirm(null);
    } catch (e) {
      console.error('Lucien getSessionHistory failed', e);
      setError(extractApiError(e, 'Failed to load session history.'));
    }
    finally { setLoadingHistory(false); }
  };

  const loadPastSessions = async () => {
    if (!agentId) return;
    try {
      const resp = await lucienApi.getAgentSessions(agentId, 0, 20);
      setPastSessions(resp.content || []);
    } catch { setPastSessions([]); }
  };

  const handleSend = async (text?: string) => {
    const raw = (text ?? input).trim();
    if (!raw || !sessionId || sending || pendingConfirm) return;
    const now = Date.now();
    if (now - lastSentAtRef.current < SEND_DEBOUNCE_MS) return;
    lastSentAtRef.current = now;

    const msg = maskPhoneNumbers(raw);
    setInput(''); setSending(true); setError(null);
    const optimistic: ChatMessage = { id: `local-${Date.now()}`, role: 'USER', content: msg, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const resp = await lucienApi.sendMessage({ sessionId, message: msg });
      const assistantMsg: ChatMessage = resp.blocked
        ? { id: resp.messageId ?? `a-${Date.now()}`, role: 'ASSISTANT', content: '', blocked: true, blockReason: resp.blockReason, createdAt: resp.timestamp ?? new Date().toISOString() }
        : { id: resp.messageId ?? `a-${Date.now()}`, role: 'ASSISTANT', content: resp.reply || '', createdAt: resp.timestamp ?? new Date().toISOString() };
      setMessages((prev) => [...prev, assistantMsg]);
      if (resp.confirmationRequired && resp.pendingActionId) {
        setPendingConfirm({
          actionId: resp.pendingActionId,
          summary: resp.pendingActionSummary || 'Lucien wants to perform an action on your behalf.',
          toolName: resp.pendingToolName,
        });
      }
    } catch (e) {
      console.error('Lucien sendMessage failed', e);
      setError(extractApiError(e, 'Lucien did not respond. Please try again.'));
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally { setSending(false); inputRef.current?.focus(); }
  };

  const handleConfirmAction = async (confirmed: boolean) => {
    if (!sessionId || !pendingConfirm) return;
    setConfirming(true); setError(null);
    try {
      const resp = await lucienApi.confirmAction(sessionId, { actionId: pendingConfirm.actionId, confirmed });
      const assistantMsg: ChatMessage = {
        id: resp.messageId ?? `a-${Date.now()}`,
        role: 'ASSISTANT',
        content: resp.reply || (confirmed ? 'Action executed.' : 'Action cancelled.'),
        createdAt: resp.timestamp ?? new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      console.error('Lucien confirmAction failed', e);
      setError(extractApiError(e, 'Failed to process confirmation. Please try again.'));
    } finally {
      setPendingConfirm(null);
      setConfirming(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // "New chat" closes the current session (keeps it in history) — it must
  // NOT delete it. Deletion is a separate, explicit, irreversible DPDP
  // erasure action available from the history panel.
  const handleNewSession = async () => {
    if (sessionId) { try { await lucienApi.closeSession(sessionId); } catch { /* ok */ } }
    setPendingConfirm(null);
    await startSession();
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Permanently delete this conversation and all its messages? This cannot be undone.')) return;
    try {
      await lucienApi.deleteSession(id);
      setPastSessions((prev) => prev.filter((s) => s.sessionId !== id));
      if (id === sessionId) {
        setSessionId(null); setMessages([]); setPendingConfirm(null);
        await startSession();
      }
    } catch (e) {
      console.error('Lucien deleteSession failed', e);
      setError(extractApiError(e, 'Failed to delete session.'));
    }
  };

  return (
    <div className="db-root">
      <div className="db-content">


        {/* ── Body: history panel + messages ── */}
        <div className="db-inner" style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0, overflow: 'hidden', paddingBottom: 24 }}>
          {showHistory && (
            <div style={{ width: 280, flexShrink: 0, height: '100%' }}>
              <LucienHistoryPanel
                sessions={pastSessions}
                activeSessionId={sessionId}
                onClose={() => setShowHistory(false)}
                onSelectSession={loadSessionHistory}
                onDeleteSession={handleDeleteSession}
              />
            </div>
          )}

          <div className="ds-card db-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 className="db-card-title">Lucien Chat</h2>
                <span className="db-section-label" style={{ padding: 0, color: 'var(--ink-tertiary)' }}>
                  / Your intelligent recovery advisor
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadPastSessions(); }}
                  className="ds-btn is-secondary" style={{ height: 32, padding: '0 8px', background: showHistory ? 'var(--ink-solid)' : 'transparent', color: showHistory ? 'var(--bg-surface)' : 'inherit' }}
                  title="Chat history"
                  aria-label="Toggle history"
                >
                  <History size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleNewSession}
                  disabled={starting}
                  className="ds-btn is-primary"
                  style={{ height: 32 }}
                  title="New chat"
                  aria-label="New chat"
                >
                  <Plus size={14} style={{ marginRight: 6 }} /> New chat
                </button>
              </div>
            </header>
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <LucienMessages
                messages={messages} sending={sending} starting={starting}
                loadingHistory={loadingHistory} error={error}
                agentFirstName={agentFirstName} bottomRef={bottomRef}
                onSendSample={handleSend}
              />
            </div>

            {pendingConfirm && (
              <div style={{
                margin: '0 24px 16px', padding: '14px 16px', borderRadius: 10,
                background: 'var(--warning-subtle, rgba(245,158,11,0.1))',
                border: '1px solid var(--warning-border, rgba(245,158,11,0.35))',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <ShieldAlert size={18} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 2 }}>
                    Confirmation required{pendingConfirm.toolName ? ` — ${pendingConfirm.toolName}` : ''}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
                    {pendingConfirm.summary}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      type="button" className="ds-btn is-primary" style={{ height: 30 }}
                      onClick={() => handleConfirmAction(true)} disabled={confirming}
                    >
                      {confirming ? <Loader2 size={13} className="ds-spin" style={{ marginRight: 6 }} /> : <Check size={13} style={{ marginRight: 6 }} />}
                      Confirm
                    </button>
                    <button
                      type="button" className="ds-btn is-secondary" style={{ height: 30 }}
                      onClick={() => handleConfirmAction(false)} disabled={confirming}
                    >
                      <X size={13} style={{ marginRight: 6 }} />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={pendingConfirm ? 'Resolve the pending confirmation above…' : sessionId ? 'Ask Lucien anything… (Enter to send, Shift+Enter for newline)' : 'Connecting…'}
                  disabled={!sessionId || sending || !!pendingConfirm}
                  className="ds-textarea"
                  aria-label="Message input"
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', resize: 'none', minHeight: 36, maxHeight: 120, padding: '8px 0', fontSize: 13, color: 'var(--ink-primary)' }}
                />
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || !sessionId || sending || !!pendingConfirm}
                  className="ds-btn is-primary"
                  style={{ width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, flexShrink: 0 }}
                  aria-label="Send message"
                >
                  {sending ? <Loader2 size={16} className="ds-spin" /> : <Send size={16} />}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, padding: '0 4px' }}>
                <p style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>
                  Private AI — your conversation stays on our servers. Do not share borrower PII.
                </p>
                {input.length > 0 && (
                  <span style={{ fontSize: 11, color: input.length > MAX_CHARS * 0.9 ? 'var(--warning)' : 'var(--ink-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {input.length}/{MAX_CHARS}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
