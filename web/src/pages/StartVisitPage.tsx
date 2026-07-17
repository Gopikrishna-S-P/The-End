import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { dailyDispatchApi } from '../api/dailyDispatchApi';
import { visitSessionApi } from '../api/visitSessionApi';
import { toastBus } from '../utils/toastBus';
import type { AllocationResponse, ApiResponse } from '../types';
import { MapPin, Briefcase, Play } from 'lucide-react';

type Tab = 'dispatch' | 'assigned';

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
      const r = await axiosInstance.get<ApiResponse<{ content: AllocationResponse[] }>>(
        '/api/v1/assignments',
        { params: { status: 'PENDING,IN_PROGRESS', page: 0, size: 50 } }
      );
      setAssignedCases(r.data.data?.content ?? []);
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
        <h1 className="page-title">Start Visit</h1>
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
          {cases.map(c => (
            <div
              key={c.id}
              className="ds-card"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.borrowerName ?? c.loanNumber}</div>
                <div style={{ fontSize: 12, color: 'var(--ds-text-subtle)' }}>{c.loanNumber}</div>
              </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
