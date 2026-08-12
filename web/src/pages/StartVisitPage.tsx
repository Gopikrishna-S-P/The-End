import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { dailyDispatchApi } from '../api/dailyDispatchApi';
import { visitSessionApi } from '../api/visitSessionApi';
import { toastBus } from '../utils/toastBus';
import type { AllocationResponse, ApiResponse } from '../types';
import { MapPin, Briefcase, Play } from 'lucide-react';
import { PILL_VARIANT, dynField } from './LoanDetailHelpers';
import '../styles/DailyDispatch.shell.css';

type Tab = 'dispatch' | 'assigned';

const fmtINR = (v?: number | null) =>
  v != null
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
    : '—';

function resolveAmount(c: AllocationResponse): number | null {
  if (typeof c.outstandingAmount === 'number') return c.outstandingAmount;
  if (typeof c.totalDue === 'number') return c.totalDue;
  const dd = c.dynamicData || {};
  const key = Object.keys(dd).find(k => {
    const kl = k.toLowerCase();
    return kl.includes('outstanding') || kl.includes('pos') || kl.includes('balance')
      || (kl.includes('total') && kl.includes('due'));
  });
  if (key != null) {
    const num = Number(String(dd[key]).replace(/[^0-9.\-]/g, ''));
    if (!Number.isNaN(num) && num !== 0) return num;
  }
  return null;
}

/** Most recent visit disposition — set/updated by the FO from the allocation
 *  detail page, so it can change between renders as visits get logged. */
function resolveDisposition(c: AllocationResponse): string | undefined {
  return c.latestDisposition || dynField(c.dynamicData || {}, ['disposition', 'Disposition', 'DISPOSITION']);
}

function getGps(): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 10000 }
    );
  });
}

export default function StartVisitPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('dispatch');
  const [dispatchCases, setDispatchCases] = useState<AllocationResponse[]>([]);
  const [assignedCases, setAssignedCases] = useState<AllocationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  const loadDispatch = useCallback(async () => {
    setLoading(true);
    try {
      const cases = await dailyDispatchApi.myList();
      setDispatchCases(cases);
    } catch {
      setDispatchCases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAssigned = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, inProgress] = await Promise.all(
        ['PENDING', 'IN_PROGRESS'].map(status =>
          axiosInstance.get<ApiResponse<{ content: AllocationResponse[] }>>(
            '/api/v1/assignments',
            { params: { status, page: 0, size: 50 } }
          )
        )
      );
      setAssignedCases([
        ...(pending.data.data?.content ?? []),
        ...(inProgress.data.data?.content ?? []),
      ]);
    } catch {
      setAssignedCases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'dispatch') {
      loadDispatch();
    } else {
      loadAssigned();
    }
  }, [tab, loadDispatch, loadAssigned]);

  const handleStart = async (allocationId: string, source: 'DISPATCH' | 'ASSIGNED') => {
    setStarting(allocationId);
    try {
      const gps = await getGps();
      await visitSessionApi.start({
        allocationId,
        source,
        lat: gps?.lat,
        lng: gps?.lng,
      });
      toastBus.success('Visit started');
      navigate('/app/today');
    } catch (e: any) {
      toastBus.error(e?.response?.data?.message ?? 'Could not start visit');
    } finally {
      setStarting(null);
    }
  };

  const cases = tab === 'dispatch' ? dispatchCases : assignedCases;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="dd-page-title">Start Visit</h1>
      </div>

      <div className="ds-tabs" style={{ marginBottom: 16 }}>
        <button
          className={`ds-tab ${tab === 'dispatch' ? 'ds-tab--active' : ''}`}
          onClick={() => setTab('dispatch')}
        >
          <MapPin size={14} /> Today's Dispatch
        </button>
        <button
          className={`ds-tab ${tab === 'assigned' ? 'ds-tab--active' : ''}`}
          onClick={() => setTab('assigned')}
        >
          <Briefcase size={14} /> All Assigned
        </button>
      </div>

      {loading ? (
        <div className="ds-empty">Loading cases…</div>
      ) : cases.length === 0 ? (
        <div className="ds-empty">No cases available</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cases.map(c => {
            const amt = resolveAmount(c);
            const disposition = resolveDisposition(c);
            return (
            <div
              key={c.id}
              className="ds-card"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.borrowerName ?? c.loanNumber}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {c.loanNumber}
                  {disposition && (
                    <span className={`ds-pill ${PILL_VARIANT[disposition] ?? ''}`} style={{ fontSize: 9.5, padding: '1px 5px', height: 'auto' }}>
                      {disposition.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {amt != null && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--ink-primary)' }}>{fmtINR(amt)}</span>
                    <span style={{ fontSize: 10, color: 'var(--ink-tertiary)' }}>POS</span>
                  </div>
                )}
                <button
                  className="ds-btn ds-btn--primary"
                  disabled={starting === c.id}
                  onClick={() => handleStart(c.id, tab === 'dispatch' ? 'DISPATCH' : 'ASSIGNED')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Play size={14} />
                  {starting === c.id ? 'Starting…' : 'Start'}
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
