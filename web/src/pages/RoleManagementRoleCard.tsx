import { ShieldCheck, ChevronDown, ChevronUp, Check, Loader2, AlertCircle, Save, Search, Lock, Building2 } from 'lucide-react';
import type { RoleResponse, PermissionResponse } from '../types';

export interface EditState {
  roleId: string;
  selected: Set<string>;
}

const SCOPE_VARIANT: Record<string, string> = { PLATFORM: 'is-warn', ORG: 'is-accent' };

function PermissionBadge({ perm }: { perm: PermissionResponse }) {
  return (
    <span className={`ds-pill ${SCOPE_VARIANT[perm.scope || ''] ?? ''}`}>
      {perm.resource}:{perm.action}
    </span>
  );
}

function SystemRoleBadge() {
  return <span className="ds-pill"><Lock size={10} /> System</span>;
}

function OrgRoleBadge({ orgName }: { orgName?: string }) {
  return <span className="ds-pill is-accent"><Building2 size={10} /> {orgName || 'Custom'}</span>;
}

export interface RoleCardProps {
  role: RoleResponse;
  expanded: boolean;
  editState: EditState | null;
  canEdit: boolean;
  saving: boolean;
  saveError: string | null;
  permSearch: string;
  filteredGrouped: Record<string, PermissionResponse[]>;
  onToggle: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onTogglePerm: (id: string) => void;
  onSave: () => void;
  onPermSearch: (q: string) => void;
}

export function RoleCard({
  role, expanded, editState, canEdit, saving, saveError,
  permSearch, filteredGrouped,
  onToggle, onStartEdit, onCancelEdit, onTogglePerm, onSave, onPermSearch,
}: RoleCardProps) {
  return (
    <div className="dd-case-row" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}>
        <div className="dd-case-info" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={14} />
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', overflow: 'hidden' }}>
                <span className="dd-case-borrower" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{role.name}</span>
                {role.systemRole ? <SystemRoleBadge /> : <OrgRoleBadge orgName={role.organizationName} />}
              </div>
              <div className="dd-case-meta">
                {role.description && (
                  <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {role.description}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="dd-case-right">
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
            {role.permissions.length} {role.permissions.length === 1 ? 'perm' : 'perms'}
          </span>
          <button type="button" className="ds-btn is-secondary is-sm" style={{ padding: '0 4px', border: 'none', background: 'transparent' }}>
            {expanded ? <ChevronUp size={14} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!editState && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="ds-label">Permissions</span>
                {canEdit && (
                  <button type="button" onClick={onStartEdit}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--ink-solid)', fontFamily: 'var(--sans)' }}>
                    Edit permissions
                  </button>
                )}
              </div>
              {role.permissions.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>No permissions assigned.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {role.permissions.map(p => <PermissionBadge key={p.id} perm={p} />)}
                </div>
              )}
            </div>
          )}

          {editState && canEdit && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span className="ds-label">Assign permissions ({editState.selected.size} selected)</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={onCancelEdit} className="ds-btn is-secondary is-sm">Cancel</button>
                  <button type="button" onClick={onSave} disabled={saving} className="ds-btn is-primary is-sm">
                    {saving ? <Loader2 size={12} className="ds-spin" /> : <Save size={12} />}Save
                  </button>
                </div>
              </div>
              {saveError && (
                <div className="rm-card-banner is-error" style={{ margin: 0 }}>
                  <AlertCircle size={13} /><span className="rm-card-banner-content">{saveError}</span>
                </div>
              )}
              <div className="rm-perm-search">
                <Search size={14} />
                <input type="search" value={permSearch} onChange={e => onPermSearch(e.target.value)} placeholder="Filter permissions…" />
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {Object.entries(filteredGrouped).map(([resource, perms]) => (
                  <div key={resource}>
                    <div className="ds-label" style={{ marginBottom: 6 }}>{resource}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {perms.map(perm => {
                        const checked = editState.selected.has(perm.id);
                        return (
                          <label key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', background: checked ? 'var(--bg-active)' : 'transparent' }}>
                            <input type="checkbox" className="ds-checkbox" checked={checked} onChange={() => onTogglePerm(perm.id)} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-primary)' }}>{perm.name}</div>
                              {perm.description && (
                                <div style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {perm.description}
                                </div>
                              )}
                            </div>
                            <PermissionBadge perm={perm} />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {Object.keys(filteredGrouped).length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--ink-tertiary)', textAlign: 'center', padding: 16 }}>No permissions match your search.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
