import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { usersApi } from '../api/usersApi';
import { rolesApi } from '../api/rolesApi';
import type { UserResponse, PagedResponse, RoleResponse } from '../types';
import { useAuth } from '../AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { Plus, RefreshCw, AlertCircle, X, Search, Building2, FileClock, MessageSquareText, UserPlus, MessageSquareWarning } from 'lucide-react';
import { UsersTable } from './UsersTable';
import { UsersEditModal } from './UsersEditModal';
import { UsersCreateModal } from './UsersCreateModal';
import { UsersPermissionsModal } from './UsersPermissionsModal';
import '../styles/AppPage.css';
import { Users, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import './Dashboard.css';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.40, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

function useRipple<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const fire = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.2;
    const span = document.createElement('span');
    span.className = 'db-ripple';
    span.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
    el.appendChild(span);
    span.addEventListener('animationend', () => span.remove(), { once: true });
  }, []);
  return { ref, fire };
}

function KpiCard({ label, value, sub, icon: Icon, accent, onClick }: {
  label: string; value: string | number;
  sub?: React.ReactNode;
  icon?: React.ElementType; accent?: boolean;
  onClick?: () => void;
}) {
  const { ref, fire } = useRipple<HTMLButtonElement>();
  return (
    <motion.button ref={ref} type="button" variants={fadeUp}
      className={`db-kpi2-card${accent ? ' is-accent' : ''}${onClick ? ' is-hoverable' : ''}`}
      onClick={e => { fire(e); onClick?.(); }} disabled={!onClick}
      whileHover={onClick ? { scale: 1.02 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      <div className="db-kpi2-top">
        <span className="db-kpi2-label">{label}</span>
        {Icon && <span className="db-kpi2-icon"><Icon size={14} aria-hidden="true" /></span>}
      </div>
      <span className="db-kpi2-value">{value}</span>
      {sub && <div className="db-kpi2-sub">{sub}</div>}
    </motion.button>
  );
}

export default function UsersPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  const role = user?.roles?.[0]?.name?.replace('ROLE_', '');
  const canCreate = hasPermission('USER_CREATE') || role === 'ORG_ADMIN' || role === 'PLATFORM_ADMIN' || role === 'AGENCY_ADMIN' || role === 'BANK_ADMIN';
  const canDelete = hasPermission('USER_DELETE') || role === 'ORG_ADMIN' || role === 'PLATFORM_ADMIN';

  const [page,            setPage]            = useState(0);
  const [data,            setData]            = useState<PagedResponse<UserResponse> | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [search,          setSearch]          = useState('');
  const [showCreate,      setShowCreate]      = useState(false);
  const [assignableRoles, setAssignableRoles] = useState<RoleResponse[]>([]);
  const [permissionsUser, setPermissionsUser] = useState<UserResponse | null>(null);
  const [editUser,        setEditUser]        = useState<UserResponse | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault(); inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    rolesApi.listRoles()
      .then(roles => setAssignableRoles(roles.filter(r => r.name !== 'ROLE_PLATFORM_ADMIN')))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await usersApi.listUsers(page, 20)); }
    catch (e: any) { setError(e?.response?.data?.message || 'Failed to load users'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const filtered = data?.content.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.email?.toLowerCase().includes(q)
      || (u.firstName ?? '').toLowerCase().includes(q)
      || (u.lastName ?? '').toLowerCase().includes(q);
  }) ?? [];

  const toggleEnabled = async (u: UserResponse) => {
    try { if (u.enabled) await usersApi.disableUser(u.id); else await usersApi.enableUser(u.id); load(); }
    catch (e: any) { setError(e?.response?.data?.message || 'Failed to update user'); }
  };

  const removeUser = async (u: UserResponse) => {
    if (!confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    try { await usersApi.deleteUser(u.id); load(); }
    catch (e: any) { setError(e?.response?.data?.message || 'Failed to delete user'); }
  };

  const removeRole = async (u: UserResponse, roleName: string) => {
    try { await usersApi.removeRole(u.id, roleName); load(); }
    catch (e: any) { setError(e?.response?.data?.message || 'Failed to remove role'); }
  };

  const addRole = async (u: UserResponse, roleName: string) => {
    try { await usersApi.assignRole(u.id, { roleName }); load(); }
    catch (e: any) { setError(e?.response?.data?.message || 'Failed to assign role'); }
  };

  const totalUsers = data?.totalElements ?? 0;
  const activeCount = data?.content.filter(u => u.enabled).length ?? 0;
  const inactiveCount = data?.content.filter(u => !u.enabled).length ?? 0;
  const adminCount = data?.content.filter(u => u.roles?.some((r: any) => r.name.includes('ADMIN'))).length ?? 0;

  return (
    <div className="dd-page">
      <div className="dd-page-header">
        <div className="dd-page-titles">
          <span className="dd-page-context">
            {!loading && data && `${totalUsers.toLocaleString('en-IN')} total users`}
          </span>
        </div>
        <div className="dd-page-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button" onClick={load} disabled={loading}
            aria-label="Refresh" title="Refresh"
            style={{ 
              width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-xs)', cursor: 'pointer', color: 'var(--ink-secondary)'
            }}
          >
            <RefreshCw size={16} className={loading ? 'ds-spin' : ''} />
          </button>
          {canCreate && (
            <button
              type="button" onClick={() => setShowCreate(true)}
              className="ds-btn is-primary" 
              style={{ 
                height: 36, borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-xs)',
                display: 'flex', alignItems: 'center' 
              }}
            >
              <Plus size={16} style={{ marginRight: 6 }} /> New user
            </button>
          )}
        </div>
      </div>

      <div className="dd-main-container" style={{ display: 'block', overflowY: 'auto' }}>
        <motion.div className="db-inner" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="db-grid">
            <div className="db-span-12" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {error && (
                <div className="db-error-banner" role="alert" style={{ margin: '0 0 16px 0' }}>
                  <AlertCircle size={16} aria-hidden="true" className="db-error-icon" />
                  <div className="db-error-body">
                    <span className="db-error-title">{error}</span>
                  </div>
                  <button className="db-error-retry" onClick={() => setError(null)} aria-label="Dismiss">
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              )}
              
              <UsersTable
                onRefresh={load}
                users={filtered} loading={loading} search={search}
                canCreate={canCreate} canDelete={canDelete}
                assignableRoles={assignableRoles} data={data} page={page}
                onEdit={setEditUser} onPermissions={setPermissionsUser}
                onToggleEnabled={toggleEnabled} onRemove={removeUser}
                onRemoveRole={removeRole} onAddRole={addRole}
                onSearchChange={setSearch} inputRef={inputRef}
                onClearSearch={() => setSearch('')} onShowCreate={() => setShowCreate(true)}
                onPageChange={setPage}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {showCreate && <UsersCreateModal roles={assignableRoles} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      {permissionsUser && <UsersPermissionsModal user={permissionsUser} onClose={() => setPermissionsUser(null)} />}
      {editUser && <UsersEditModal user={editUser} onClose={() => setEditUser(null)} onSaved={() => { setEditUser(null); load(); }} />}
    </div>
  );
}
