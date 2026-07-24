import { useState, useEffect } from 'react';
import type { UserResponse, RoleResponse, PagedResponse } from '../types';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Plus, Loader2, X, ToggleLeft, ToggleRight, Trash2,
  Lock, UserPlus, KeyRound, Pencil, ChevronLeft, ChevronRight, Search, RefreshCw, Edit2, UserCog
} from 'lucide-react';
import './Dashboard.css';

export const roleLabel = (name: string) =>
  name.replace(/^ROLE_/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const AVATAR_COLORS = ['#0AA550','#0EA5E9','#8B5CF6','#F59E0B','#EF4444','#14B8A6','#EC4899'];
const avatarColor = (name: string) => {
  const sum = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
};

interface Props {
  users: UserResponse[];
  loading: boolean;
  search: string;
  canCreate: boolean;
  canDelete: boolean;
  assignableRoles: RoleResponse[];
  data: PagedResponse<UserResponse> | null;
  page: number;
  onEdit: (u: UserResponse) => void;
  onPermissions: (u: UserResponse) => void;
  onToggleEnabled: (u: UserResponse) => void;
  onRemove: (u: UserResponse) => void;
  onRemoveRole: (u: UserResponse, rn: string) => void;
  onAddRole: (u: UserResponse, rn: string) => void;
  onSearchChange: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  onClearSearch: () => void;
  onShowCreate: () => void;
  onPageChange: (p: number) => void;
  onRefresh?: () => void;
}

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

export function UsersTable({
  users, loading, search, canCreate, canDelete, assignableRoles, data, page,
  onEdit, onPermissions, onToggleEnabled, onRemove, onRemoveRole, onAddRole,
  onSearchChange, inputRef, onClearSearch, onShowCreate, onPageChange, onRefresh,
}: Props) {
  const totalUsers = data?.totalElements ?? 0;

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen, inputRef]);

  return (
    <div className="ds-card dd-cases-card is-overflow-hidden" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <header className="db-card-head" style={{ borderBottom: 'none', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="db-card-title">Directory</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AnimatePresence initial={false}>
            {isSearchOpen ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 220, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0 8px', height: 30, overflow: 'hidden' }}
              >
                <Search size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  type="search"
                  value={search}
                  onChange={e => onSearchChange(e.target.value)}
                  placeholder="Search name or email…"
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%', paddingLeft: 8 }}
                />
                <button type="button" onClick={() => { onClearSearch(); setIsSearchOpen(false); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, display: 'flex', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                  <X size={14} />
                </button>
              </motion.div>
            ) : (
              <motion.button
                type="button"
                style={{ 
                  width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '8px', 
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)', cursor: 'pointer', color: '#4b5563'
                }}
                onClick={() => setIsSearchOpen(true)}
                title="Search"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Search size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="dd-cp-list-wrap">
        <div className="dd-cp-list">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="dd-case-skel">
                <span className="ds-skel" style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="ds-skel" style={{ height: 14, width: '40%', borderRadius: 4 }} />
                  <span className="ds-skel" style={{ height: 11, width: '25%', borderRadius: 4 }} />
                </div>
              </div>
            ))
          ) : users.length === 0 ? (
            <motion.div className="dd-cp-empty" variants={fadeIn} initial="hidden" animate="show">
              <div className="dd-cp-empty-icon">
                <UserPlus size={20} />
              </div>
              <span className="dd-cp-empty-title">{search ? 'No users match your search' : 'No users yet'}</span>
              <span className="dd-cp-empty-sub">
                {search ? 'Try a different name or email address.' : 'Add your first team member using the "New user" button.'}
              </span>
            </motion.div>
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column' }}>
              {users.map((u) => {
                const userRoles = Array.from((u.roles ?? []) as any).map((r: any) => r.name as string);
                const initials = `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() || '?';
                const fullName = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—';
                const aColor = avatarColor(fullName);
                return (
                  <motion.div key={u.id} variants={fadeUp} className="dd-case-row">
                    <div className="dd-case-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, background: `${aColor}20`, border: `1px solid ${aColor}40`, color: aColor }}>
                          {initials}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="dd-case-borrower" style={{ fontSize: 13 }}>{fullName}</span>
                            <span className={`ds-pill ${u.enabled ? 'is-success' : 'is-neutral'}`} style={{ fontSize: 9, padding: '0 6px', height: 16 }}>{u.enabled ? 'Active' : 'Disabled'}</span>
                          </div>
                          <div className="dd-case-meta">
                            <span>{u.email}</span>
                            {userRoles.length === 0 && <span style={{ fontStyle: 'italic' }}>• no roles</span>}
                            {userRoles.map(rn => (
                              <span key={rn} style={{ display: 'flex', alignItems: 'center' }}>
                                • {roleLabel(rn)}
                                {canCreate && (
                                  <button type="button" onClick={() => onRemoveRole(u, rn)} title="Remove role" aria-label="Remove role" style={{ marginLeft: 2, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-tertiary)' }}>
                                    <X size={10} />
                                  </button>
                                )}
                              </span>
                            ))}
                            {canCreate && assignableRoles.filter(r => !userRoles.includes(r.name)).length > 0 && (
                              <select value="" onChange={e => { if (e.target.value) onAddRole(u, e.target.value); }}
                                style={{ fontSize: 11, padding: '0 4px', border: 'none', background: 'transparent', color: 'var(--ink-solid)', cursor: 'pointer' }}>
                                <option value="">+ add role</option>
                                {assignableRoles.filter(r => !userRoles.includes(r.name)).map(r => (
                                  <option key={r.id} value={r.name}>{roleLabel(r.name)}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="dd-case-right" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {canCreate && (
                        <button type="button" onClick={() => onEdit(u)} 
                          style={{ height: 32, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer', color: '#4b5563', fontSize: 13, fontWeight: 500 }}>
                          <UserCog size={14} color="#4b5563" /> Edit
                        </button>
                      )}
                      {canCreate && (
                        <button type="button" onClick={() => onPermissions(u)} 
                          style={{ height: 32, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer', color: '#4b5563', fontSize: 13, fontWeight: 500 }}>
                          <Lock size={14} color="#4b5563" /> Access
                        </button>
                      )}
                      {canCreate && (
                        <button type="button" onClick={() => onToggleEnabled(u)} 
                          style={{ 
                            height: 32, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, 
                            backgroundColor: u.enabled ? 'var(--danger-subtle)' : 'var(--brand-subtle)', 
                            border: `1px solid ${u.enabled ? 'var(--danger-border)' : 'var(--success-border)'}`, 
                            borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer', 
                            color: u.enabled ? 'var(--danger-solid)' : 'var(--brand)', fontSize: 13, fontWeight: 500 
                          }}>
                          {u.enabled ? <ToggleRight size={16} color="var(--danger-solid)" /> : <ToggleLeft size={16} color="var(--brand)" />}
                          {u.enabled ? 'Disable' : 'Enable'}
                        </button>
                      )}
                      {canDelete && (
                        <button type="button" onClick={() => onRemove(u)} 
                          style={{ 
                            height: 32, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, 
                            backgroundColor: 'var(--danger-subtle)', border: '1px solid var(--danger-border)', 
                            borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer', 
                            color: 'var(--danger-solid)', fontSize: 13, fontWeight: 500 
                          }}>
                          <Trash2 size={14} color="var(--danger-solid)" /> Delete
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      {(data?.totalPages ?? 0) > 1 && (
        <footer className="up-pagination" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
          <span className="up-page-meta">
            Page <strong>{page + 1}</strong> of <strong>{data?.totalPages}</strong>
            {' · '}<strong>{totalUsers.toLocaleString('en-IN')}</strong> users
          </span>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <button type="button" onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0} aria-label="Previous page"
              style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: page === 0 ? 'not-allowed' : 'pointer', color: '#4b5563', opacity: page === 0 ? 0.5 : 1 }}>
              <ChevronLeft size={16} />
            </button>
            <button type="button" onClick={() => onPageChange(Math.min((data?.totalPages ?? 1) - 1, page + 1))} disabled={page >= (data?.totalPages ?? 1) - 1} aria-label="Next page"
              style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: page >= (data?.totalPages ?? 1) - 1 ? 'not-allowed' : 'pointer', color: '#4b5563', opacity: page >= (data?.totalPages ?? 1) - 1 ? 0.5 : 1 }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
