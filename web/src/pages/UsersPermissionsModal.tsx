import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../api/usersApi';
import { permissionsApi } from '../api/permissionsApi';
import type { UserResponse, UserPermissionsResponse, PermissionResponse } from '../types';
import { X, Loader2, AlertCircle, ShieldCheck, Search, KeyRound } from 'lucide-react';

interface Props {
  user: UserResponse;
  onClose: () => void;
}

export function UsersPermissionsModal({ user, onClose }: Props) {
  const [perms,         setPerms]         = useState<UserPermissionsResponse | null>(null);
  const [allPerms,      setAllPerms]      = useState<PermissionResponse[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [search,        setSearch]        = useState('');
  const [adding,        setAdding]        = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [p, all] = await Promise.all([usersApi.getUserPermissions(user.id), permissionsApi.listPermissions()]);
      setPerms(p); setAllPerms(all);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load permissions');
    } finally { setLoading(false); }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const revoke = async (permName: string) => {
    setActionLoading(permName); setError(null);
    try { setPerms(await usersApi.revokePermission(user.id, permName)); }
    catch (e: any) { setError(e?.response?.data?.message || 'Failed to revoke permission'); }
    finally { setActionLoading(null); }
  };

  const grant = async (permName: string) => {
    setActionLoading(permName); setError(null);
    try { setPerms(await usersApi.grantPermission(user.id, permName)); setAdding(false); setSearch(''); }
    catch (e: any) { setError(e?.response?.data?.message || 'Failed to grant permission'); }
    finally { setActionLoading(null); }
  };

  const directNames = new Set((perms?.direct ?? []).map(d => d.name));
  const grouped = Array.from(new Set((perms?.fromRoles ?? []).map(p => p.name)))
    .reduce<Record<string, string[]>>((acc, pname) => {
      const p = (perms?.fromRoles ?? []).find(x => x.name === pname);
      if (!p) return acc;
      (acc[p.resource] ??= []).push(p.action);
      return acc;
    }, {});

  const grantable = allPerms.filter(p => {
    if (directNames.has(p.name)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.resource.toLowerCase().includes(q) || p.action.toLowerCase().includes(q);
  });

  const fullName = `${user.firstName} ${user.lastName}`.trim() || user.email;

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal users-modal-lg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="ds-modal-header">
          <div>
            <div className="ds-modal-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <KeyRound size={14} style={{ color: 'var(--ink-secondary)' }} />Permissions — {fullName}
            </div>
            <div className="ds-modal-sub">{user.email}</div>
          </div>
          <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close"><X size={16} /></button>
        </div>

        <div className="ds-modal-body">
          {error && <div className="users-banner is-error" style={{ margin: 0 }}><AlertCircle size={14} /><span className="users-banner-content">{error}</span></div>}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <Loader2 size={20} className="ds-spin" style={{ color: 'var(--ink-secondary)' }} />
            </div>
          ) : (
            <>
              <div>
                <p style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-tertiary)', marginBottom: 10 }}>
                  From roles ({(perms?.fromRoles ?? []).length})
                </p>
                {Object.keys(grouped).length === 0 ? (
                  <p style={{ fontSize: 11.5, color: 'var(--ink-tertiary)', fontStyle: 'italic' }}>No role permissions.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.entries(grouped).sort().map(([resource, actions]) => (
                      <div key={resource} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ flexShrink: 0, marginTop: 2, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-subtle)', color: 'var(--ink-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {resource}
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {actions.sort().map(a => <span key={a} className="ds-pill is-info">{a}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-tertiary)' }}>
                    Direct permissions ({(perms?.direct ?? []).length})
                  </p>
                  <button type="button" onClick={() => { setAdding(v => !v); setSearch(''); }} className="ds-icon-btn is-sm is-text" style={{ color: 'var(--ink-solid)' }}>
                    {adding ? 'Cancel' : '+ Add'}
                  </button>
                </div>

                {(perms?.direct ?? []).length === 0 && !adding && (
                  <p style={{ fontSize: 11.5, color: 'var(--ink-tertiary)', fontStyle: 'italic' }}>No direct permissions assigned.</p>
                )}

                {(perms?.direct ?? []).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(perms?.direct ?? []).sort((a, b) => a.name.localeCompare(b.name)).map(dp => (
                      <div key={dp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <ShieldCheck size={13} style={{ color: 'var(--ink-secondary)', flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dp.name}</p>
                            {dp.description && <p style={{ fontSize: 10.5, color: 'var(--ink-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dp.description}</p>}
                          </div>
                        </div>
                        <button type="button" onClick={() => revoke(dp.name)} disabled={actionLoading === dp.name}
                          className="ds-icon-btn is-sm" title="Remove permission" aria-label="Remove permission" style={{ width: 28, height: 28, marginLeft: 8, flexShrink: 0 }}>
                          {actionLoading === dp.name ? <Loader2 size={12} className="ds-spin" /> : <X size={12} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {adding && (
                  <div style={{ marginTop: 12, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-surface)' }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                      <div className="users-perm-search">
                        <Search size={12} />
                        <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search permissions…" />
                      </div>
                    </div>
                    <div style={{ maxHeight: 192, overflowY: 'auto' }}>
                      {grantable.length === 0 ? (
                        <p style={{ padding: 12, fontSize: 11.5, color: 'var(--ink-tertiary)', fontStyle: 'italic', textAlign: 'center' }}>
                          {search ? 'No matches.' : 'All permissions already granted.'}
                        </p>
                      ) : (
                        grantable.map(p => (
                          <button type="button" key={p.id} onClick={() => grant(p.name)} disabled={actionLoading === p.name}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', opacity: actionLoading === p.name ? 0.4 : 1, fontFamily: 'var(--sans)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-subtle)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-primary)' }}>{p.name}</p>
                              {p.description && <p style={{ fontSize: 10.5, color: 'var(--ink-tertiary)' }}>{p.description}</p>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-subtle)', color: 'var(--ink-secondary)', flexShrink: 0 }}>{p.resource}</span>
                              {actionLoading === p.name && <Loader2 size={12} className="ds-spin" style={{ color: 'var(--ink-tertiary)' }} />}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="ds-modal-actions">
          <button type="button" onClick={onClose} className="ds-btn is-secondary" style={{ flex: 1, justifyContent: 'center' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
