import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsApi, type MisEodReportResponse } from '../api/reportsApi';
import { useAuth } from '../AuthContext';
import { RefreshCw, ShieldAlert, ClipboardCheck, Download } from 'lucide-react';
import { fmtINR, fmtNum } from './DashboardShared';
import '../styles/AppPage.css';
import './Dashboard.css';

const fmtTime = (s?: string | null) =>
  s ? new Date(s).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '—';

function csvCell(v: string | number | null | undefined): string {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

function csvDownload(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AgentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const orgId = user?.organizationId ?? '';

  const [misEod, setMisEod] = useState<MisEodReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const r = await reportsApi.getMisEod(orgId);
      setMisEod(r);
    } catch {
      setMisEod(null);
    } finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const exportMis = () => {
    if (!misEod || misEod.foBreakdown.length === 0) return;
    const header = 'Agent,Login,Logout,Dispatched,Visited,Collected,Amount Collected,PTPs Made,Non-contactable,Distance (km)\n';
    const rows = misEod.foBreakdown.map(r => [
      csvCell(r.agentName), csvCell(fmtTime(r.loginTime)), csvCell(fmtTime(r.logoutTime)),
      csvCell(r.dispatched), csvCell(r.visited), csvCell(r.collected), csvCell(r.amountCollected),
      csvCell(r.ptpMade), csvCell(r.nonContactable), csvCell(r.distanceKm.toFixed(1)),
    ].join(',')).join('\n');
    csvDownload(`mis-eod-${misEod.date}.csv`, header + rows);
  };

  return (
    <div className="dd-page">
      <div className="dd-page-header">
        <div className="dd-page-titles">
          <h1 className="dd-page-title">Field Agents</h1>
          <span className="dd-page-context">
            {!loading && misEod ? `${misEod.activeAgents} active today` : 'Manage field team'}
          </span>
        </div>
        <div className="dd-page-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" onClick={() => navigate('/app/field-ops')}
            className="ds-btn is-secondary" title="Field Ops (live map + SOS & incidents)" aria-label="Field Ops">
            <ShieldAlert size={14} style={{ marginRight: 6 }} /> Field Ops
          </button>
          <button type="button" onClick={() => navigate('/app/attendance')}
            className="ds-btn is-secondary" title="Attendance" aria-label="Attendance">
            <ClipboardCheck size={14} />
          </button>
          <button type="button" onClick={load} disabled={loading}
            className="ds-btn is-secondary" aria-label="Refresh" title="Refresh">
            <RefreshCw size={14} className={loading ? 'ds-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="dd-main-container">
        <div style={{ marginBottom: 24 }}>
          <div className="ds-card dd-cases-card is-overflow-hidden" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="dd-cases-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>MIS — Today</span>
              <button type="button" onClick={exportMis} disabled={!misEod || misEod.foBreakdown.length === 0}
                className="ds-btn is-success is-sm">
                <Download size={13} /> Export
              </button>
            </div>

            <div className="ds-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table className="ds-table">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '10px 16px', paddingLeft: 24 }}>Agent</th>
                    <th style={{ padding: '10px 16px' }}>Login</th>
                    <th style={{ padding: '10px 16px' }}>Logout</th>
                    <th className="is-right" style={{ padding: '10px 16px' }}>Dispatched</th>
                    <th className="is-right" style={{ padding: '10px 16px' }}>Visited</th>
                    <th className="is-right" style={{ padding: '10px 16px' }}>Collected</th>
                    <th className="is-right" style={{ padding: '10px 16px' }}>Amount</th>
                    <th className="is-right" style={{ padding: '10px 16px' }}>PTPs</th>
                    <th className="is-right" style={{ padding: '10px 16px' }}>Non-contactable</th>
                    <th className="is-right" style={{ padding: '10px 16px', paddingRight: 24 }}>Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td colSpan={10} style={{ padding: '12px 24px' }}>
                          <span className="ds-skel" style={{ height: 14, width: '30%', display: 'block' }} />
                        </td>
                      </tr>
                    ))
                  ) : !misEod || misEod.foBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--ink-tertiary)', fontSize: 13 }}>
                        No field activity recorded yet today.
                      </td>
                    </tr>
                  ) : (
                    misEod.foBreakdown.map((r) => (
                      <tr key={r.agentId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 16px', paddingLeft: 24, fontWeight: 600 }}>{r.agentName}</td>
                        <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtTime(r.loginTime)}</td>
                        <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtTime(r.logoutTime)}</td>
                        <td className="is-right" style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)' }}>{fmtNum(r.dispatched)}</td>
                        <td className="is-right" style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)' }}>{fmtNum(r.visited)}</td>
                        <td className="is-right" style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)' }}>{fmtNum(r.collected)}</td>
                        <td className="is-right" style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)' }}>{fmtINR(r.amountCollected)}</td>
                        <td className="is-right" style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)' }}>{fmtNum(r.ptpMade)}</td>
                        <td className="is-right" style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)' }}>{fmtNum(r.nonContactable)}</td>
                        <td className="is-right" style={{ padding: '10px 16px', paddingRight: 24, fontFamily: 'var(--font-mono)' }}>{r.distanceKm.toFixed(1)} km</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
