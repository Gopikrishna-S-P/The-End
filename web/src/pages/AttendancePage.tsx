import { useEffect, useState, useCallback, useRef } from 'react';
import { attendanceApi } from '../api/attendanceApi';
import type { AttendanceRecord } from '../types';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Download, ChevronLeft, ChevronRight, CalendarDays, MapPin, RefreshCw, Activity } from 'lucide-react';
import { Pagination } from '../components/Pagination';
import '../styles/AppPage.css';
import './Dashboard.css';
import '../styles/ds/ds.empty.css';

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
}

function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function csvCell(v: string | number | null | undefined): string {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.40, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.28, ease: 'easeOut' as const } },
};

export default function AttendancePage() {
  const [date, setDate] = useState(today());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const pageSize = 20;

  const dateInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (d: string, p: number) => {
    setLoading(true);
    try {
      const res = await attendanceApi.getByDate(d, p, pageSize);
      setRecords(res.content);
      setTotal(res.totalElements);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(date, page); }, [date, page, load]);

  const shiftDate = (delta: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    setPage(0);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await attendanceApi.getByDate(date, 0, 9999);
      const header = 'Name,Date,Check-in Time,Latitude,Longitude,Accuracy (m)\n';
      const rows = all.content.map(r =>
        [csvCell(r.userName), csvCell(r.attendanceDate), csvCell(formatTime(r.checkedInAt)),
         csvCell(r.lat), csvCell(r.lng), csvCell(r.accuracy)].join(',')
      ).join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const dispatchDayLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="dd-page db-fill-root">
      <div className="dd-page-header">
        <div className="dd-page-titles">
          <span className="dd-page-context">Daily staff check-in log</span>
        </div>
        <div className="db-list-page-actions">
          <div className="dd-date-nav">
            <div className="dd-date-display" onClick={() => dateInputRef.current?.showPicker?.()}>
              <button type="button" className="dd-date-arrow" onClick={(e) => { e.stopPropagation(); shiftDate(-1); }} aria-label="Previous day">
                <ChevronLeft size={15} />
              </button>
              <CalendarDays size={13} className="dd-date-icon" />
              <span className="dd-date-label">{dispatchDayLabel}</span>
              <button type="button" className="dd-date-arrow" onClick={(e) => { e.stopPropagation(); shiftDate(1); }} aria-label="Next day">
                <ChevronRight size={15} />
              </button>
            </div>
            <input ref={dateInputRef} type="date" value={date}
              onChange={e => { setDate(e.target.value); setPage(0); }} className="dd-date-input-hidden" />
          </div>
          <div className="db-list-btn-group">
            <button type="button" onClick={() => load(date, page)} disabled={loading}
              className="ds-btn is-secondary" aria-label="Refresh" title="Refresh">
              <RefreshCw size={14} className={loading ? 'ds-spin' : ''} /> Refresh
            </button>
            <button type="button" onClick={exportCsv} disabled={records.length === 0 || exporting} className="ds-btn is-success">
              <Download size={14} /> {exporting ? 'Exporting…' : 'Export'}
            </button>
          </div>
        </div>
      </div>

      <div className="dd-main-container">
        <div className="dd-case-panel" style={{ flex: 1 }}>
          <motion.section variants={fadeUp} className="ds-card dd-cases-card is-overflow-hidden is-list-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="dd-cases-head" style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <h3 className="db-list-title">Attendance</h3>
                <AnimatePresence>
                  {!loading && total > 0 && (
                    <motion.span className="ds-pill is-neutral"
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontFeatureSettings: '"tnum", "zero"' }}>
                        {total.toLocaleString('en-IN')}
                      </span> check-ins
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="dd-cp-list-wrap" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <div className="dd-cp-list" style={{ padding: 0 }}>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="db-att-row is-list-row" style={{ opacity: 1 - i * 0.15, cursor: 'default', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span className="ds-skel" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span className="ds-skel" style={{ height: 14, width: '30%', borderRadius: 4 }} />
                        <span className="ds-skel" style={{ height: 11, width: '40%', borderRadius: 4 }} />
                      </div>
                    </div>
                  ))
                ) : records.length === 0 ? (
                  <motion.div variants={fadeIn} initial="hidden" animate="show" className="ds-empty">
                    <div className="ds-empty-icon">
                      <Activity size={24} />
                    </div>
                    <div className="ds-empty-title">
                      No attendance records
                    </div>
                    <div className="ds-empty-sub">
                      No one has checked in for {formatDate(date + 'T00:00:00')}.
                    </div>
                  </motion.div>
                ) : (
                  <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column' }}>
                    {records.map((r, i) => (
                      <motion.div key={r.id} variants={fadeUp} className="db-att-row is-list-row" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-secondary)', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                           {r.userName.substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="db-att-label">{r.userName}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-tertiary)', display: 'flex', gap: 8, marginTop: 2 }}>
                             <span>Check-in: {formatTime(r.checkedInAt)}</span>
                             {r.accuracy != null && <span>· Accuracy: {Math.round(r.accuracy)}m</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                           {r.lat != null && r.lng != null ? (
                             <a href={mapsLink(r.lat, r.lng)} target="_blank" rel="noopener noreferrer" className="ds-btn is-secondary is-sm" style={{ textDecoration: 'none' }}>
                               <MapPin size={13} /> GPS
                             </a>
                           ) : (
                             <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>No GPS</span>
                           )}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>

            {!loading && total > 0 && (
              <Pagination
                currentPage={page}
                totalPages={Math.max(1, totalPages)}
                onPageChange={setPage}
                totalElements={total}
                itemLabel="records"
              />
            )}
          </motion.section>
        </div>
      </div>
    </div>
  );
}
