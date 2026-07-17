import type { CSSProperties } from 'react';
import { Loader2, X, Trash2 } from 'lucide-react';
import type { UploadRowResponse } from '../api/uploadDataApi';
import { UploadCell, type EditingCell } from './UploadCell';
import { UploadAddRowForm } from './UploadAddRowForm';
import './Dashboard.css';

interface Props {
  columns: string[];
  rows: UploadRowResponse[];
  editingCell: EditingCell | null;
  savingCell: boolean;
  canUpdateRow: boolean;
  canDeleteRow: boolean;
  canDeleteCol: boolean;
  showAddRow: boolean;
  canCreateRow: boolean;
  deletingRow: string | null;
  deletingCol: string | null;
  confirmDeleteRow: string | null;
  confirmDeleteCol: string | null;
  onStartEdit: (rowId: string, col: string) => void;
  onCellSave: (row: UploadRowResponse, col: string, val: string) => void;
  onCancelEdit: () => void;
  onDeleteRow: (rowId: string) => void;
  onDeleteCol: (col: string) => void;
  onSetConfirmDeleteRow: (rowId: string | null) => void;
  onSetConfirmDeleteCol: (col: string | null) => void;
  onAddRow: (data: Record<string, string>) => Promise<void>;
  onCancelAddRow: () => void;
}

export function UploadDataTable({
  columns, rows, editingCell, savingCell, canUpdateRow, canDeleteRow, canDeleteCol,
  showAddRow, canCreateRow, deletingRow, deletingCol, confirmDeleteRow, confirmDeleteCol,
  onStartEdit, onCellSave, onCancelEdit, onDeleteRow, onDeleteCol,
  onSetConfirmDeleteRow, onSetConfirmDeleteCol, onAddRow, onCancelAddRow,
}: Props) {
  return (
    <div className="ds-table-wrap" style={{ border: 'none', borderRadius: 0, overflow: 'auto', height: '100%' }}>
      <table className="ds-table" style={{ whiteSpace: 'nowrap' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-surface)' }}>
          <tr>
            <th style={{ width: 48, textAlign: 'center', borderRight: '1px solid var(--border-subtle)', padding: '12px 16px' }}>#</th>
            {columns.map(col => (
              <th key={col} className="ud-col-header" style={{ borderRight: '1px solid var(--border-subtle)', padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{col}</span>
                  {canDeleteCol && (
                    confirmDeleteCol === col ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button type="button" onClick={() => onSetConfirmDeleteCol(null)}
                          className="db-customize-btn"
                          style={{ height: 20, padding: '0 6px', fontSize: 11, textDecoration: 'none' }}>No</button>
                        <button type="button" onClick={() => onDeleteCol(col)} disabled={deletingCol === col}
                          className="db-error-retry"
                          style={{ height: 20, padding: '0 6px', fontSize: 11, background: 'var(--danger-subtle)', color: 'var(--danger)' }}>
                          {deletingCol === col ? <Loader2 size={10} className="ds-spin" /> : null}Del
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => onSetConfirmDeleteCol(col)}
                        className="db-error-retry"
                        style={{ width: 20, height: 20, opacity: 0.6, background: 'transparent' }}
                        title={`Remove column "${col}"`} aria-label={`Remove column ${col}`}>
                        <X size={11} />
                      </button>
                    )
                  )}
                </div>
              </th>
            ))}
            <th style={{ padding: '12px 16px', width: 64 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="ud-data-row" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', borderRight: '1px solid var(--border-subtle)' }}>
                {row.rowNumber}
              </td>
              {columns.map(col => (
                <td key={col} style={{ padding: '12px 16px', borderRight: '1px solid var(--border-subtle)' }}>
                  <UploadCell
                    value={String(row.data?.[col] ?? '')}
                    editing={editingCell?.rowId === row.id && editingCell?.col === col}
                    onStartEdit={() => onStartEdit(row.id, col)}
                    onSave={val => onCellSave(row, col, val)}
                    onCancel={onCancelEdit}
                  />
                </td>
              ))}
              {canDeleteRow && (
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  {confirmDeleteRow === row.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                      <button type="button" onClick={() => onSetConfirmDeleteRow(null)}
                        className="db-customize-btn"
                        style={{ height: 24, padding: '0 8px', fontSize: 11, textDecoration: 'none' }}>No</button>
                      <button type="button" onClick={() => onDeleteRow(row.id)} disabled={deletingRow === row.id}
                        className="db-error-retry"
                        style={{ height: 24, padding: '0 8px', fontSize: 11, background: 'var(--danger-subtle)', color: 'var(--danger)' }}>
                        {deletingRow === row.id ? <Loader2 size={11} className="ds-spin" /> : null}Del
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => onSetConfirmDeleteRow(row.id)}
                      className="db-error-retry" style={{ background: 'transparent' }}
                      title="Delete row" aria-label="Delete row">
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {showAddRow && columns.length > 0 && canCreateRow && (
            <UploadAddRowForm columns={columns} onAdd={onAddRow} onCancel={onCancelAddRow} />
          )}
        </tbody>
      </table>
    </div>
  );
}

