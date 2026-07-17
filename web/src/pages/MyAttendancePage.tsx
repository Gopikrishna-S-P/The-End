import { useEffect, useState } from 'react';
import { attendanceApi } from '../api/attendanceApi';
import type { AttendanceRecord } from '../types';

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
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">My Attendance</h1>
        <span className="ds-badge">Last 30 days</span>
      </div>

      <div className="ds-card">
        {loading ? (
          <div className="ds-empty">Loading…</div>
        ) : records.length === 0 ? (
          <div className="ds-empty">No attendance records found.</div>
        ) : (
          <table className="ds-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Check-in Time</th>
                <th>GPS</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td>{formatDay(r.attendanceDate)}</td>
                  <td>{formatTime(r.checkedInAt)}</td>
                  <td>
                    {r.lat != null && r.lng != null ? (
                      <span style={{ color: 'var(--ds-success)' }}>&#10003; Recorded</span>
                    ) : (
                      <span style={{ color: 'var(--ds-text-subtle)' }}>No GPS</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
