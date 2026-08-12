import { useEffect, useState } from 'react';
import { attendanceApi } from '../api/attendanceApi';
import type { AttendanceRecord } from '../types';
import '../styles/AppPage.css';
import '../styles/PlatformSetupPage.css';
function isoToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function iso30DaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
}

function formatDay(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString([], {
    weekday: 'short', day: '2-digit', month: 'short',
  });
}

export default function MyAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    attendanceApi.getMyAttendance(iso30DaysAgo(), isoToday())
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="db-root db-fill-root" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="db-content" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', flex: 1, paddingBottom: 36 }}>
        <div className="db-page-header">
          <div className="db-page-header-left">
            <p className="dd-page-context">
              Your attendance records for the <strong>last 30 days</strong>.
            </p>
          </div>
        </div>

        <div className="db-inner" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="ds-table-card db-card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 0 }}>
            {loading ? (
              <div className="ds-empty">Loading…</div>
            ) : records.length === 0 ? (
              <div className="ds-empty">No attendance records found.</div>
            ) : (
              <div className="db-table-wrapper" style={{ flex: 1, overflowY: 'auto' }}>
                <table className="ps-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Day</th>
                      <th style={{ width: '30%' }}>Check-in Time</th>
                      <th style={{ width: '30%', textAlign: 'right', paddingRight: 32 }}>GPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 500 }}>{formatDay(r.attendanceDate)}</td>
                        <td>{formatTime(r.checkedInAt)}</td>
                        <td style={{ textAlign: 'right', paddingRight: 32 }}>
                          {r.lat != null && r.lng != null ? (
                            <span className="ds-pill is-success" style={{ padding: '2px 6px', fontSize: 11 }}>Recorded</span>
                          ) : (
                            <span className="ds-pill is-neutral" style={{ padding: '2px 6px', fontSize: 11 }}>No GPS</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
