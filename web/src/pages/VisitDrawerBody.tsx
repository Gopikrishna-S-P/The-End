import {
  Loader2, MapPin, CheckCircle2, Phone, Camera, Navigation,
  MessageSquare, Banknote, Calendar, FileText, ChevronRight,
  AlertCircle, IndianRupee, Route
} from 'lucide-react';
import type { VisitLogResponse, AllocationResponse } from '../types';
import type { VisitSession } from '../types/visitSession';
import { fmtDate, fmtDT, fmtINR, VisitPill, Row, getDynField } from './VisitDrawerHelpers';

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
}

function diffMins(from: string | null | undefined, to: string | null | undefined): number | null {
  if (!from || !to) return null;
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);
}

function fmtMins(mins: number | null): string {
  if (mins === null) return '';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function fmtKm(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

function gpsLink(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function GpsPin({ lat, lng }: { lat: number | null; lng: number | null }) {
  const link = gpsLink(lat, lng);
  if (!link) return <span style={{ color: 'var(--ink-tertiary)', fontSize: 11 }}>No GPS</span>;
  return (
    <a href={link} target="_blank" rel="noreferrer"
      style={{ color: 'var(--ink-solid)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <MapPin size={10} />{`${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`}
    </a>
  );
}

interface Props {
  visit: VisitLogResponse;
  allocation: AllocationResponse | null;
  img1: string | null;
  img2: string | null;
  imgLoading: boolean;
  proofDocs: any[];
  proofLoading: boolean;
  hasGPS: boolean;
  setLightboxUrl: (url: string) => void;
  session?: VisitSession | null;
  onClose?: () => void;
  canDelete?: boolean;
  onDeleteClick?: () => void;
}

export function VisitDrawerBody({ visit, allocation, img1, img2, imgLoading, proofDocs, proofLoading, hasGPS, setLightboxUrl, session, onClose, canDelete, onDeleteClick }: Props) {
  return (
    <div className="db-grid" style={{ gridTemplateColumns: '1fr', gap: 24, paddingBottom: 40 }}>
      
      {/* ── Identity Header Card ── */}
      <div className="ds-card db-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {onClose && (
                <button type="button" onClick={onClose} className="ds-drawer-close" aria-label="Close" style={{ alignSelf: 'center' }}>
                  <ChevronRight size={16} />
                </button>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink-primary)', margin: 0 }}>
                  {allocation?.borrowerName ?? 'Visit details'}
                </h1>
                {allocation?.loanNumber && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink-secondary)', fontWeight: 500 }}>
                    {allocation.loanNumber}
                  </span>
                )}
              </div>
              {visit.disp && (
                <VisitPill status={visit.disp} />
              )}
              {allocation?.npaFlagged && (
                <span className="ds-pill is-danger" style={{ fontWeight: 600 }}>
                  <AlertCircle size={12} style={{ marginRight: 4 }} /> NPA
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 32, alignItems: 'center', textAlign: 'right' }}>
            {allocation?.outstandingAmount != null && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: 13, color: 'var(--ink-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IndianRupee size={12} /> POS
                </span>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink-primary)' }}>
                  {fmtINR(allocation.outstandingAmount)}
                </span>
              </div>
            )}
            {allocation?.totalDue != null && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: 13, color: 'var(--ink-secondary)', marginBottom: 4 }}>Total Due</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink-primary)' }}>
                  {fmtINR(allocation.totalDue)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink-secondary)' }}>
            Officer: <span style={{ color: 'var(--ink-primary)', fontWeight: 600 }}>{visit.agentName ?? 'Unknown agent'}</span>
          </div>
          {canDelete && onDeleteClick && (
            <button type="button" className="ds-btn is-danger is-sm" onClick={onDeleteClick} style={{ height: 32 }}>
              Delete visit
            </button>
          )}
        </div>
      </div>
      
      {allocation && (
        <div className="ds-card db-card">
          <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
            <h2 className="db-card-title"><FileText size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} /> Loan information</h2>
          </header>
          <div className="db-card-body" style={{ padding: '8px 20px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', columnGap: 24, rowGap: 0 }}>
              <Row label="Loan number">{allocation.loanNumber}</Row>
              <Row label="Borrower">{allocation.borrowerName}</Row>
              {allocation.totalDue != null && <Row label="Total due">{fmtINR(allocation.totalDue)}</Row>}
              {allocation.outstandingAmount != null && (
                <Row label="Outstanding"><span style={{ fontWeight: 600, color: 'var(--warning)' }}>{fmtINR(allocation.outstandingAmount)}</span></Row>
              )}
              {getDynField(allocation.dynamicData, 'segment') && <Row label="Segment">{getDynField(allocation.dynamicData, 'segment')}</Row>}
              {getDynField(allocation.dynamicData, 'branch')  && <Row label="Branch">{getDynField(allocation.dynamicData, 'branch')}</Row>}
              {getDynField(allocation.dynamicData, 'product') && <Row label="Product">{getDynField(allocation.dynamicData, 'product')}</Row>}
            </div>
          </div>
        </div>
      )}

      <div className="ds-card db-card">
        <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
          <h2 className="db-card-title"><Calendar size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} /> Visit information</h2>
        </header>
        <div className="db-card-body" style={{ padding: '8px 20px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', columnGap: 24, rowGap: 0 }}>
            <Row label="Visit date">{fmtDate(visit.visitDate)}</Row>
            {visit.visitTime && <Row label="Visit time">{fmtDT(visit.visitTime)}</Row>}
            {visit.nextVisitDate && <Row label="Promise to pay">{fmtDate(visit.nextVisitDate)}</Row>}
            {visit.rescheduleReason && <Row label="Reschedule reason">{visit.rescheduleReason}</Row>}
            <Row label="Created">{fmtDT(visit.createdAt)}</Row>
          </div>
        </div>
      </div>

      {session && (
        <div className="ds-card db-card">
          <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
            <h2 className="db-card-title"><Route size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} /> Field visit timeline</h2>
          </header>
          <div className="db-card-body" style={{ padding: '16px 20px 20px' }}>

            {/* Summary strip */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total duration</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>
                  {fmtMins(diffMins(session.startedAt, session.closedAt ?? new Date().toISOString()))}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Distance</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>{fmtKm(session.distanceMetres)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-secondary)' }}>{session.source}</span>
              </div>
            </div>

            {/* Vertical timeline */}
            <div style={{ position: 'relative', paddingLeft: 28 }}>
              {/* connector line */}
              <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: 'var(--border-subtle)' }} />

              {/* STARTED */}
              <TimelineStep
                color="#3b82f6" label="Started"
                time={fmtTime(session.startedAt)}
                gps={<GpsPin lat={session.startedLat} lng={session.startedLng} />}
                gap={session.reachedAt ? `${fmtMins(diffMins(session.startedAt, session.reachedAt))} transit` : null}
              />

              {/* REACHED */}
              {session.reachedAt && (
                <TimelineStep
                  color="#22c55e" label="Reached"
                  time={fmtTime(session.reachedAt)}
                  gps={<GpsPin lat={session.reachedLat} lng={session.reachedLng} />}
                  gap={session.waitingSince ? `${fmtMins(diffMins(session.reachedAt, session.waitingSince))} before waiting` : null}
                />
              )}

              {/* WAITING */}
              {session.waitingSince && (
                <TimelineStep
                  color="#f59e0b" label="Waiting"
                  time={fmtTime(session.waitingSince)}
                  gps={null}
                  gap={session.closedAt ? `waited ${fmtMins(diffMins(session.waitingSince, session.closedAt))}` : 'still waiting'}
                />
              )}

              {/* CLOSED / ABANDONED */}
              {session.closedAt && (
                <TimelineStep
                  color={session.status === 'ABANDONED' ? '#ef4444' : '#6b7280'}
                  label={session.status === 'ABANDONED' ? 'Abandoned' : 'Closed'}
                  time={fmtTime(session.closedAt)}
                  gps={null}
                  gap={null}
                  last
                />
              )}
            </div>
          </div>
        </div>
      )}

      {(visit.disp || visit.contactability || visit.residenceStatus || visit.officeStatus || visit.classificationCode || visit.reasonForDefault) && (
        <div className="ds-card db-card">
          <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
            <h2 className="db-card-title"><CheckCircle2 size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} /> Field assessment</h2>
          </header>
          <div className="db-card-body" style={{ padding: '8px 20px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', columnGap: 24, rowGap: 0 }}>
              {visit.disp            && <Row label="Disposition"><VisitPill status={visit.disp} /></Row>}
              {visit.contactability  && <Row label="Contactability">{visit.contactability.replace(/_/g, ' ')}</Row>}
              {visit.residenceStatus && <Row label="Residence status">{visit.residenceStatus.replace(/_/g, ' ')}</Row>}
              {visit.officeStatus    && <Row label="Office status">{visit.officeStatus.replace(/_/g, ' ')}</Row>}
              {visit.classificationCode && <Row label="Classification">{visit.classificationCode}</Row>}
              {visit.reasonForDefault   && <Row label="Reason for default">{visit.reasonForDefault.replace(/_/g, ' ')}</Row>}
              {visit.customerProfile    && <Row label="Customer profile">{visit.customerProfile}</Row>}
            </div>
          </div>
        </div>
      )}

      {(visit.contactPerson || visit.contactNumber) && (
        <div className="ds-card db-card">
          <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
            <h2 className="db-card-title"><Phone size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} /> Contact</h2>
          </header>
          <div className="db-card-body" style={{ padding: '8px 20px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', columnGap: 24, rowGap: 0 }}>
              {visit.contactPerson && <Row label="Contact person">{visit.contactPerson}</Row>}
              {visit.contactNumber && <Row label="Contact number">{visit.contactNumber}</Row>}
            </div>
          </div>
        </div>
      )}

      {visit.amountCollected != null && (
        <div className="ds-card db-card">
          <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
            <h2 className="db-card-title"><Banknote size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} /> Collection</h2>
          </header>
          <div className="db-card-body" style={{ padding: '8px 20px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', columnGap: 24, rowGap: 0 }}>
              <Row label="Amount collected">
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--success)' }}>{fmtINR(visit.amountCollected)}</span>
              </Row>
              {visit.paymentMode && <Row label="Payment mode">{visit.paymentMode.replace(/_/g, ' ')}</Row>}
            </div>
            
            <div style={{ marginTop: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>Payment proof</span>
              {proofLoading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-tertiary)' }}>
                  <Loader2 size={12} className="ds-spin" /> Loading…
                </span>
              ) : proofDocs.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--ink-tertiary)', fontStyle: 'italic', margin: 0 }}>No proof attached</p>
              ) : (
                <div className="vis-photo-grid">
                  {proofDocs.map((doc: any) => (
                    <button key={doc.id} type="button" onClick={() => setLightboxUrl(doc.viewUrl)} className="vis-photo" title={doc.originalFilename}>
                      <img src={doc.viewUrl} alt={doc.originalFilename ?? 'Payment proof'} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(hasGPS || visit.gpsAddress) && (
        <div className="ds-card db-card">
          <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
            <h2 className="db-card-title"><Navigation size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} /> GPS location</h2>
          </header>
          <div className="db-card-body" style={{ padding: '8px 20px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', columnGap: 24, rowGap: 0 }}>
              {visit.gpsAddress && <Row label="Address">{visit.gpsAddress}</Row>}
              {hasGPS && (
                <Row label="Coordinates">
                  <a href={`https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`} target="_blank" rel="noreferrer" style={{ color: 'var(--ink-solid)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={11} />{`${Number(visit.latitude).toFixed(6)}, ${Number(visit.longitude).toFixed(6)}`}
                  </a>
                </Row>
              )}
              {visit.gpsAccuracy != null && <Row label="Accuracy">±{Number(visit.gpsAccuracy).toFixed(1)} m</Row>}
              <Row label="GPS status"><VisitPill status={visit.visitStatus} /></Row>
            </div>
          </div>
        </div>
      )}

      <div className="ds-card db-card">
        <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
          <h2 className="db-card-title"><CheckCircle2 size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} /> Approval</h2>
        </header>
        <div className="db-card-body" style={{ padding: '8px 20px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', columnGap: 24, rowGap: 0 }}>
            <Row label="Status"><VisitPill status={visit.approvalStatus} /></Row>
            {visit.approvalRemarks && <Row label="Remarks">{visit.approvalRemarks}</Row>}
            {visit.approvedAt      && <Row label="Approved at">{fmtDT(visit.approvedAt)}</Row>}
          </div>
        </div>
      </div>

      {(imgLoading || img1 || img2) && (
        <div className="ds-card db-card">
          <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
            <h2 className="db-card-title"><Camera size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} /> Visit photos</h2>
          </header>
          <div className="db-card-body" style={{ padding: '8px 20px 20px' }}>
            <div style={{ padding: '8px 0' }}>
              {imgLoading ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <div className="ds-skel" style={{ width: 96, height: 96 }} />
                  <div className="ds-skel" style={{ width: 96, height: 96 }} />
                </div>
              ) : (img1 || img2) ? (
                <div className="vis-photo-grid">
                  {img1 && <button type="button" onClick={() => setLightboxUrl(img1)} className="vis-photo"><img src={img1} alt="Visit photo 1" /></button>}
                  {img2 && <button type="button" onClick={() => setLightboxUrl(img2)} className="vis-photo"><img src={img2} alt="Visit photo 2" /></button>}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>No photos available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {(visit.visitNotes || visit.fieldUpdateFeedback || visit.internalRemarks) && (
        <div className="ds-card db-card">
          <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
            <h2 className="db-card-title"><MessageSquare size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} /> Notes &amp; feedback</h2>
          </header>
          <div className="db-card-body" style={{ padding: '8px 20px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', columnGap: 24, rowGap: 0 }}>
              {visit.visitNotes          && <Row label="Visit notes">{visit.visitNotes}</Row>}
              {visit.fieldUpdateFeedback && <Row label="Agent feedback">{visit.fieldUpdateFeedback}</Row>}
              {visit.internalRemarks     && <Row label="Internal remarks">{visit.internalRemarks}</Row>}
            </div>
          </div>
        </div>
      )}

      {visit.lastVisitedAddress && (
        <div className="ds-card db-card">
          <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
            <h2 className="db-card-title"><MapPin size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} /> Last known address</h2>
          </header>
          <div className="db-card-body" style={{ padding: '8px 20px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', columnGap: 24, rowGap: 0 }}>
              <Row label="Address">{visit.lastVisitedAddress}</Row>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineStep({ color, label, time, gps, gap, last }: {
  color: string; label: string; time: string;
  gps: React.ReactNode; gap: string | null; last?: boolean;
}) {
  return (
    <div style={{ position: 'relative', marginBottom: last ? 0 : 24 }}>
      {/* dot */}
      <div style={{
        position: 'absolute', left: -24, top: 3,
        width: 14, height: 14, borderRadius: '50%',
        background: color, border: '2px solid var(--bg-canvas)',
        boxShadow: `0 0 0 2px ${color}40`,
      }} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-primary)' }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)' }}>{time}</span>
        {gps && <span>{gps}</span>}
      </div>
      {gap && (
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--ink-tertiary)', fontStyle: 'italic' }}>{gap}</div>
      )}
    </div>
  );
}
