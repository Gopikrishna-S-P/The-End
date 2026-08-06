import React, { useState } from 'react';
import { columnSchemasApi, type ColumnSchemaResponse, type ColumnSchemaRequest } from '../api/columnSchemasApi';
import { AlertCircle, Save, Loader2, ChevronDown } from 'lucide-react';
import type { UploadType } from '../types/reports';

export const DATA_TYPES = ['STRING', 'NUMBER', 'DATE', 'BOOLEAN', 'EMAIL', 'PHONE', 'CURRENCY'];

export const TYPE_VARIANT: Record<string, string> = {
  STRING:   '',
  NUMBER:   'is-info',
  DATE:     'is-info',
  BOOLEAN:  'is-warn',
  EMAIL:    'is-info',
  PHONE:    'is-info',
  CURRENCY: 'is-accent',
};

export interface RowFormState {
  name: string;
  displayName: string;
  dataType: string;
  isRequired: boolean;
  isSearchable: boolean;
  sortOrder: string;
}

export const EMPTY_FORM: RowFormState = {
  name: '', displayName: '', dataType: 'STRING',
  isRequired: false, isSearchable: false, sortOrder: '0',
};

export function validate(form: RowFormState): string | null {
  if (!form.name.trim()) return 'CSV column name is required.';
  if (!/^[a-z0-9_]+$/.test(form.name.trim()))
    return 'Column name must be lowercase letters, numbers, and underscores only (e.g. loan_number).';
  if (!form.displayName.trim()) return 'Display name is required.';
  return null;
}

export function RowForm({
  initial, orgId, entityType, onSaved, onCancel,
}: {
  initial: RowFormState & { id?: string };
  orgId: string;
  /** Which entity's mapping this column belongs to; omitted means the allocation book. */
  entityType?: UploadType;
  onSaved: (col: ColumnSchemaResponse) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<RowFormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof RowFormState, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(form);
    if (err) { setError(err); return; }
    setSaving(true); setError(null);
    const payload: ColumnSchemaRequest = {
      organizationId: orgId,
      entityType,
      name: form.name.trim(),
      displayName: form.displayName.trim(),
      dataType: form.dataType,
      isRequired: form.isRequired,
      isSearchable: form.isSearchable,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      const saved = initial.id
        ? await columnSchemasApi.update(initial.id, payload)
        : await columnSchemasApi.create(payload);
      onSaved(saved);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? 'Failed to save column.');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ background: 'color-mix(in srgb, var(--ink-solid) 2%, transparent)', borderBottom: '1px solid var(--border-subtle)', padding: '16px', width: '100%', boxSizing: 'border-box' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', background: 'var(--danger-subtle)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500 }}>
              <AlertCircle size={14} /><span>{error}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
            <div className="ds-field" style={{ flex: '1 1 200px' }}>
              <label className="ds-label is-required" style={{ marginBottom: 6, display: 'block' }}>CSV column</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. loan_number" autoFocus className="ds-input" style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
            </div>
            <div className="ds-field" style={{ flex: '1 1 200px' }}>
              <label className="ds-label is-required" style={{ marginBottom: 6, display: 'block' }}>Display name</label>
              <input value={form.displayName} onChange={(e) => set('displayName', e.target.value)} placeholder="e.g. Loan number" className="ds-input" style={{ width: '100%', fontSize: 13 }} />
            </div>
            <div className="ds-field" style={{ width: 120 }}>
              <label className="ds-label" style={{ marginBottom: 6, display: 'block' }}>Type</label>
              <div style={{ position: 'relative' }}>
                <select value={form.dataType} onChange={(e) => set('dataType', e.target.value)} className="ds-input" style={{ width: '100%', fontSize: 12, appearance: 'none', paddingRight: 24 }}>
                  {DATA_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--ink-tertiary)' }} />
              </div>
            </div>
            <div className="ds-field" style={{ width: 80 }}>
              <label className="ds-label" style={{ marginBottom: 6, display: 'block' }}>Sort</label>
              <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} className="ds-input" style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isRequired} onChange={(e) => set('isRequired', e.target.checked)} className="ds-checkbox" />Required
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isSearchable} onChange={(e) => set('isSearchable', e.target.checked)} className="ds-checkbox" />Searchable
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
              <button type="button" onClick={onCancel} className="ds-btn is-secondary" style={{ height: 34 }}>Cancel</button>
              <button type="submit" disabled={saving} className="ds-btn is-primary" style={{ height: 34 }}>
                {saving ? <Loader2 size={14} className="ds-spin" style={{ marginRight: 6 }} /> : <Save size={14} style={{ marginRight: 6 }} />}
                {initial.id ? 'Update' : 'Add column'}
              </button>
            </div>
          </div>
        </form>
    </div>
  );
}
