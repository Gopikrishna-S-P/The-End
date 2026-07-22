import { useCallback, useEffect, useState } from 'react';
import { platformApi, type OrganizationSummary } from '../api/platformApi';
import {
  Building2, AlertCircle, Mail, ToggleLeft, ToggleRight, Pen, Trash2, UserPlus,
} from 'lucide-react';
import { CreateOrgModal, EditOrgModal, DeleteOrgModal, AssignAdminModal } from './PlatformSetupOrgModals';

interface Props {
  orgs: OrganizationSummary[];
  onOrgsChange: (orgs: OrganizationSummary[]) => void;
  showCreate: boolean;
  setShowCreate: (v: boolean) => void;
}

export function OrgsTab({ orgs, onOrgsChange, showCreate, setShowCreate }: Props) {
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [editing,   setEditing]   = useState<OrganizationSummary | null>(null);
  const [deleting,  setDeleting]  = useState<OrganizationSummary | null>(null);
  const [assigning, setAssigning] = useState<OrganizationSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const list = await platformApi.listOrganizations();
      onOrgsChange(list);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load organizations');
    } finally { setLoading(false); }
  }, [onOrgsChange]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (org: OrganizationSummary) => {
    try {
      const updated = await platformApi.setActive(org.id, !org.isActive);
      onOrgsChange(orgs.map(o => o.id === updated.id ? updated : o));
    } catch { /* interceptor shows toast */ }
  };

  return (
    <>
      {error && (
        <div className="ps-banner is-error" style={{ marginBottom: 10 }}>
          <AlertCircle size={14} /><span className="ps-banner-content">{error}</span>
        </div>
      )}

      {/* ── Table ── */}
      <div className="ds-table-card">
        <div className="ds-table-wrap">
          <table className="ds-table is-no-row-hover ps-table">
            <thead>
              <tr>
                <th>Name</th><th>Code</th><th>Org admin</th>
                <th className="is-right">Users</th><th>Created</th><th>Status</th>
                <th className="is-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ opacity: 1 - i * 0.08 }}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j}><div className="ds-skel" style={{ height: 14, width: '75%' }} /></td>
                    ))}
                  </tr>
                ))
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="ds-empty">
                      <span className="ds-empty-icon"><Building2 size={20} /></span>
                      <span className="ds-empty-title">No organizations yet</span>
                      <span className="ds-empty-sub">Create your first organization to get started.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                orgs.map(o => (
                  <tr key={o.id}>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--ink-primary)' }}>
                        <Building2 size={14} style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }} />{o.name}
                      </div>
                    </td>
                    <td className="is-mono is-muted">{o.code}</td>
                    <td>
                      {o.orgAdminEmail ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--ink-primary)' }}>
                          <Mail size={11} style={{ color: 'var(--ink-tertiary)' }} />{o.orgAdminEmail}
                        </div>
                      ) : (
                        <button type="button" onClick={() => setAssigning(o)} className="ps-row-action">
                          <UserPlus size={12} /> Assign admin
                        </button>
                      )}
                    </td>
                    <td className="is-right is-mono is-muted">{o.userCount.toLocaleString()}</td>
                    <td className="is-mono is-muted" style={{ whiteSpace: 'nowrap' }}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td>
                      <span className={`ds-pill ${o.isActive ? 'is-success' : 'is-neutral'}`}>
                        {o.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="is-right">
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => toggleActive(o)} className="ds-table-row-action"
                          title={o.isActive ? 'Deactivate' : 'Activate'}>
                          {o.isActive
                            ? <ToggleRight size={16} style={{ color: 'var(--success)' }} />
                            : <ToggleLeft  size={16} />}
                        </button>
                        <button type="button" onClick={() => setEditing(o)} className="ds-table-row-action" title="Edit">
                          <Pen size={14} />
                        </button>
                        <button type="button" onClick={() => setDeleting(o)}
                          className="ds-table-row-action is-danger" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CreateOrgModal onClose={() => setShowCreate(false)}
          onCreated={org => { onOrgsChange([org, ...orgs]); setShowCreate(false); }} />
      )}
      {editing && (
        <EditOrgModal org={editing} onClose={() => setEditing(null)}
          onUpdated={updated => { onOrgsChange(orgs.map(o => o.id === updated.id ? updated : o)); setEditing(null); }} />
      )}
      {deleting && (
        <DeleteOrgModal org={deleting} onClose={() => setDeleting(null)}
          onDeleted={id => { onOrgsChange(orgs.filter(o => o.id !== id)); setDeleting(null); }} />
      )}
      {assigning && (
        <AssignAdminModal org={assigning} onClose={() => setAssigning(null)}
          onAssigned={updated => { onOrgsChange(orgs.map(o => o.id === updated.id ? updated : o)); setAssigning(null); }} />
      )}
    </>
  );
}
