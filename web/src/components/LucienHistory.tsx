import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquare, Search, Trash2, X } from 'lucide-react';
import { lucienApi, type SessionResponse } from '../api/lucienApi';

// Backed by real endpoints — GET /agents/{id}/sessions lists past conversations
// and DELETE /sessions/{id} is the DPDP erasure call. Deletion here is
// permanent, so it goes through an explicit inline confirm rather than a
// one-tap trash icon.

function dayBucket(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Earlier';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = d.getTime();
  if (t >= startOfToday) return 'Today';
  if (t >= startOfToday - 86_400_000) return 'Yesterday';
  if (t >= startOfToday - 7 * 86_400_000) return 'Previous 7 days';
  if (t >= startOfToday - 30 * 86_400_000) return 'Previous 30 days';
  return 'Earlier';
}

const BUCKET_ORDER = ['Today', 'Yesterday', 'Previous 7 days', 'Previous 30 days', 'Earlier'];

interface Props {
  open: boolean;
  agentId: string;
  activeSessionId: string | null;
  onClose: () => void;
  onOpenSession: (sessionId: string) => void;
  onDeletedActive: () => void;
}

export function LucienHistory({
  open, agentId, activeSessionId, onClose, onOpenSession, onDeletedActive,
}: Props) {
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [failed,   setFailed]   = useState(false);
  const [query,    setQuery]    = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    setFailed(false);
    try {
      const page = await lucienApi.getAgentSessions(agentId, 0, 50);
      setSessions(Array.isArray(page?.content) ? page.content : []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { if (open) load(); }, [open, load]);
  useEffect(() => { if (!open) { setConfirmId(null); setQuery(''); } }, [open]);

  const remove = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      await lucienApi.deleteSession(id);
      setSessions(prev => prev.filter(s => s.sessionId !== id));
      if (id === activeSessionId) onDeletedActive();
    } catch {
      setFailed(true);
    } finally {
      setDeleting(null);
      setConfirmId(null);
    }
  }, [activeSessionId, onDeletedActive]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = sessions
      .filter(s => !q || (s.sessionId ?? '').toLowerCase().includes(q))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const map = new Map<string, SessionResponse[]>();
    for (const s of rows) {
      const b = dayBucket(s.updatedAt || s.createdAt);
      if (!map.has(b)) map.set(b, []);
      map.get(b)!.push(s);
    }
    return BUCKET_ORDER
      .filter(b => map.has(b))
      .map(b => ({ bucket: b, rows: map.get(b)! }));
  }, [sessions, query]);

  if (!open) return null;

  return (
    <div className="lucien-history" role="dialog" aria-label="Conversation history">
      <div className="lucien-history-head">
        <span className="lucien-history-title">Chats</span>
        <button type="button" className="lucien-panel-icon-btn" onClick={onClose} aria-label="Close history">
          <X size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="lucien-history-search">
        <Search size={13} aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search chats"
          aria-label="Search conversations"
        />
      </div>

      <div className="lucien-history-list">
        {loading && (
          <div className="lucien-history-status">
            <Loader2 size={14} className="lucien-spin" aria-hidden="true" /> Loading chats…
          </div>
        )}

        {!loading && failed && (
          <div className="lucien-history-status">
            Couldn't load chats.
            <button type="button" className="lucien-history-retry" onClick={load}>Retry</button>
          </div>
        )}

        {!loading && !failed && grouped.length === 0 && (
          <div className="lucien-history-status">
            {query ? 'No chats match that search.' : 'No past chats yet.'}
          </div>
        )}

        {grouped.map(({ bucket, rows }) => (
          <div key={bucket} className="lucien-history-group">
            <span className="lucien-history-bucket">{bucket}</span>
            {rows.map(s => {
              const isActive  = s.sessionId === activeSessionId;
              const isConfirm = s.sessionId === confirmId;
              return (
                <div key={s.sessionId} className={`lucien-history-item${isActive ? ' is-active' : ''}`}>
                  <button type="button" className="lucien-history-open"
                    onClick={() => onOpenSession(s.sessionId)}>
                    <MessageSquare size={13} aria-hidden="true" />
                    <span className="lucien-history-label">
                      Chat · {s.totalMessages || 0} message{s.totalMessages === 1 ? '' : 's'}
                    </span>
                  </button>

                  {isConfirm ? (
                    <span className="lucien-history-confirm">
                      <button type="button" className="lucien-history-confirm-btn is-danger"
                        onClick={() => remove(s.sessionId)} disabled={deleting === s.sessionId}>
                        {deleting === s.sessionId
                          ? <Loader2 size={11} className="lucien-spin" aria-hidden="true" />
                          : 'Delete'}
                      </button>
                      <button type="button" className="lucien-history-confirm-btn"
                        onClick={() => setConfirmId(null)}>Keep</button>
                    </span>
                  ) : (
                    <button type="button" className="lucien-history-del"
                      onClick={() => setConfirmId(s.sessionId)}
                      aria-label="Delete this chat permanently">
                      <Trash2 size={12} aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className="lucien-history-note">Deleting a chat erases it permanently.</p>
    </div>
  );
}
