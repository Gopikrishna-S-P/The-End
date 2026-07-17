import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Bell, AtSign, UserCheck, Clock, X, CheckCheck,
  Check, Inbox, ArrowRight,
} from 'lucide-react';
import {
  notifications,
  useNotifications,
  type Notification,
  type NotifType,
} from '../utils/notifications';
import './Dashboard.css';

type Filter = 'all' | 'unread';

const TYPE_LABEL: Record<NotifType, string> = {
  system:     'System',
  mention:    'Mentions',
  assignment: 'Assignments',
  deadline:   'Deadlines',
};
const TYPE_ICON: Record<NotifType, React.ElementType> = {
  system:     Bell,
  mention:    AtSign,
  assignment: UserCheck,
  deadline:   Clock,
};
const TYPE_ORDER: NotifType[] = ['mention', 'assignment', 'deadline', 'system'];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'just now';
  const min = Math.floor(diff / 60000);
  if (min < 1)  return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
}

// ── Motion variants ────────────────────────────────────────────────────────────

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.22, ease: 'easeOut' as const } },
};

export default function NotificationsPage() {
  const navigate   = useNavigate();
  const list       = useNotifications();
  const [filter, setFilter] = useState<Filter>('all');

  const active = useMemo(() => {
    const now = Date.now();
    return list.filter(n => !n.snoozedUntil || new Date(n.snoozedUntil).getTime() <= now);
  }, [list]);

  const unreadCount = useMemo(() => active.filter(n => !n.read).length, [active]);

  const visible = useMemo(() => (
    filter === 'unread' ? active.filter(n => !n.read) : active
  ), [active, filter]);

  const groups = useMemo(() => {
    const byType = new Map<NotifType, Notification[]>();
    for (const t of TYPE_ORDER) byType.set(t, []);
    for (const n of visible) { const arr = byType.get(n.type); if (arr) arr.push(n); }
    return TYPE_ORDER.map(t => ({ type: t, items: byType.get(t) ?? [] })).filter(g => g.items.length > 0);
  }, [visible]);

  return (
    <div className="db-root">
      <div className="db-content">


        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show" style={{ maxWidth: 800, margin: '0 auto' }}>
          <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginTop: 0 }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 className="db-card-title">Notification Centre</h2>
                <span className="db-section-label" style={{ padding: 0, color: 'var(--ink-tertiary)' }}>
                  / {unreadCount} unread
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="db-trend-range-toggle" style={{ margin: 0 }}>
                  <button
                    type="button"
                    className={`db-trend-range-btn${filter === 'all' ? ' is-active' : ''}`}
                    onClick={() => setFilter('all')}
                  >
                    All <span className="ds-pill is-neutral" style={{ marginLeft: 6, fontSize: 10 }}>{active.length}</span>
                  </button>
                  <button
                    type="button"
                    className={`db-trend-range-btn${filter === 'unread' ? ' is-active' : ''}`}
                    onClick={() => setFilter('unread')}
                  >
                    Unread <span className={`ds-pill ${unreadCount > 0 ? 'is-warn' : 'is-neutral'}`} style={{ marginLeft: 6, fontSize: 10 }}>{unreadCount}</span>
                  </button>
                </div>
                {unreadCount > 0 && (
                  <button type="button" className="ds-btn is-secondary" style={{ height: 32 }} onClick={() => notifications.markAllRead()}>
                    <CheckCheck size={14} style={{ marginRight: 6 }} /> Mark all read
                  </button>
                )}
                {visible.length > 0 && (
                  <button type="button" className="ds-btn is-secondary" style={{ height: 32, color: 'var(--danger)', background: 'var(--danger-subtle)', border: 'none' }} onClick={() => notifications.clearAll()}>
                    <X size={14} style={{ marginRight: 6 }} /> Clear all
                  </button>
                )}
              </div>
            </header>
            <div className="db-card-body" style={{ padding: 24, minHeight: 400 }}>
              {visible.length === 0 ? (
                <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                  <span className="ds-empty-icon" style={{ background: filter === 'unread' ? 'var(--warning-subtle)' : 'var(--bg-subtle)', color: filter === 'unread' ? 'var(--warning)' : 'var(--ink-secondary)' }}>
                    {filter === 'unread' ? <CheckCheck size={28} /> : <Inbox size={28} />}
                  </span>
                  <span className="ds-empty-title">
                    {filter === 'unread' ? 'No unread notifications' : 'All caught up'}
                  </span>
                  <span className="ds-empty-sub">
                    {filter === 'unread' ? 'Switch to All to view past notifications.' : 'New activity will appear here.'}
                  </span>
                </motion.div>
              ) : (
                <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                  {groups.map(group => {
                    const GroupIcon = TYPE_ICON[group.type];
                    const colorMap: Record<NotifType, string> = {
                      system: 'var(--info)',
                      mention: 'var(--accent)',
                      assignment: 'var(--success)',
                      deadline: 'var(--warning)',
                    };
                    const color = colorMap[group.type];
                    return (
                      <motion.div key={group.type} variants={fadeUp} style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                          <GroupIcon size={14} style={{ color }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)' }}>{TYPE_LABEL[group.type]}</span>
                          <span className="ds-pill is-neutral" style={{ fontSize: 10, marginLeft: 'auto' }}>{group.items.length}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {group.items.map((notif, idx) => (
                            <NotifRow key={notif.id} notif={notif} color={color} onNavigate={(to) => navigate(to)} />
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}

interface NotifRowProps {
  notif: Notification;
  color: string;
  onNavigate: (to: string) => void;
}

function NotifRow({ notif, color, onNavigate }: NotifRowProps) {
  const Icon     = TYPE_ICON[notif.type];
  const showOpen = notif.actions?.open        !== false && !!notif.to;
  const showAck  = notif.actions?.acknowledge !== false;

  return (
    <div style={{ 
      display: 'flex', alignItems: 'flex-start', gap: 16, padding: '16px', 
      background: notif.read ? 'transparent' : 'color-mix(in srgb, var(--ink-solid) 2%, transparent)', 
      borderRadius: 12, border: '1px solid var(--border-subtle)',
      position: 'relative', overflow: 'hidden'
    }}>
      {!notif.read && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color }} />}
      
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `color-mix(in srgb, ${color} 15%, transparent)`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} />
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: notif.read ? 500 : 700, color: 'var(--ink-primary)' }}>{notif.title}</span>
          <time dateTime={notif.createdAt} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)', whiteSpace: 'nowrap' }}>
            {timeAgo(notif.createdAt)}
          </time>
        </div>
        {notif.body && <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.5 }}>{notif.body}</p>}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          {showOpen && (
            <button type="button" className="db-customize-btn" style={{ padding: '0 12px', height: 28, background: 'var(--ink-solid)', color: 'var(--bg-surface)' }} onClick={() => { notifications.markRead(notif.id); onNavigate(notif.to!); }}>
              Open <ArrowRight size={12} style={{ marginLeft: 6 }} />
            </button>
          )}
          {showAck && (
            <button type="button" className="db-customize-btn" style={{ padding: '0 12px', height: 28 }} onClick={() => notifications.markRead(notif.id)} disabled={notif.read}>
              <Check size={12} style={{ marginRight: 6 }} />
              {notif.read ? 'Read' : 'Mark read'}
            </button>
          )}
          <button type="button" className="db-error-retry" style={{ marginLeft: 'auto', background: 'transparent' }} onClick={() => notifications.dismiss(notif.id)} aria-label="Dismiss">
            <X size={14} style={{ color: 'var(--ink-tertiary)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
