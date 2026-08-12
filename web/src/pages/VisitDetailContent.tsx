import type { ReactNode } from 'react';
import {
  Loader2, MapPin, CheckCircle2, Phone, Camera, Navigation,
  MessageSquare, Banknote, Calendar, FileText, ArrowLeft,
  AlertCircle, IndianRupee, Route, Trash2,
} from 'lucide-react';
import type { VisitLogResponse, AllocationResponse } from '../types';
import type { VisitSession } from '../types/visitSession';
import { fmtDate, fmtDT, fmtINR, VisitPill, getDynField } from './VisitDrawerHelpers';

/* ── Local formatters (same behaviour the drawer body used) ───────────────── */

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
function GpsPin({ lat, lng }: { lat: number | null; lng: number | null }) {
  if (lat == null || lng == null) return <span style={{ color: 'var(--ink-tertiary)', fontSize: 11 }}>No GPS</span>;
  return (
    <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer"
      style={{ color: 'var(--ink-solid)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <MapPin size={10} />{`${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`}
    </a>
  );
}

/* ── Sheet primitives — the LoanDetailPage vocabulary ─────────────────────── */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ld-field">
      <dt className="ld-field-label" title={label}>{label}</dt>
      <dd className="ld-field-value">{children}</dd>
    </div>
  );
}

function Section({ icon: Icon, label, children }: { icon: typeof FileText; label: string; children: ReactNode }) {
  return (
    <section className="ld-section">
      <h2 className="ld-section-label"><Icon size={12} /> {label}</h2>
      {children}
    </section>
  );
}

interface ProofDoc { id: string; viewUrl: string; originalFilename?: string }

interface Props {
  visit: VisitLogResponse;
  allocation: AllocationResponse | null;
  img1: string | null;
  img2: string | null;
  imgLoading: boolean;
  proofDocs: unknown[];
  proofLoading: boolean;
  hasGPS: boolean;
  setLightboxUrl: (url: string) => void;
  session?: VisitSession | null;
  onBack: () => void;
  canDelete?: boolean;
  onDeleteClick?: () => void;
}

export function VisitDetailContent({
  visit, allocation, img1, img2, imgLoading, proofDocs, proofLoading,
  hasGPS, setLightboxUrl, session, onBack, canDelete, onDeleteClick,
}: Props) {
  const docs = proofDocs as ProofDoc[];

  // Nothing shown in the head — identity, pills, or the facts strip — is
  // repeated in the sheet below, so these guards drop a section once its
  // non-duplicated fields are all empty.
  const hasAssessment = Boolean(
    visit.contactability || visit.residenceStatus || visit.officeStatus ||
    visit.classificationCode || visit.reasonForDefault || visit.customerProfile
  );
  const hasNotes = Boolean(visit.visitNotes || visit.fieldUpdateFeedback || visit.internalRemarks);
  const hasApprovalDetail = Boolean(visit.approvalRemarks || visit.approvedAt);

  const segment = allocation ? getDynField(allocation.dynamicData, 'segment') : null;
  const branch  = allocation ? getDynField(allocation.dynamicData, 'branch')  : null;
  const product = allocation ? getDynField(allocation.dynamicData, 'product') : null;

  return (
    /* .vis-detail-card, not .ld-card: same shell, but sized to its content
       rather than `flex:1; min-height:0`. The page scrolls, not the card. */
    <div className="ds-card db-card vis-detail-card">

      {/* ── Fixed top block: identity, state, and the facts that give the
             fields below their context. Nothing here scrolls. ───────────── */}
      <header className="ld-head">

        <div className="ld-card-head">
          <h2 className="db-list-title">Visit</h2>
          <div className="ld-head-actions">
            <button type="button" onClick={onBack} className="ds-btn is-secondary is-sm" aria-label="Back to visit log">
              <ArrowLeft size={14} /> Back
            </button>
            {canDelete && onDeleteClick && (
              <button type="button" onClick={onDeleteClick} className="ds-btn is-danger is-sm">
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
        </div>

        <div className="ld-head-top">
          <div className="ld-identity">
            <h1 className="db-detail-title">{allocation?.borrowerName ?? 'Visit details'}</h1>
            <span className="ld-loan-ref">{allocation?.loanNumber ?? visit.loanNumber ?? '—'}</span>
          </div>

          <div className="ld-head-pills">
            {visit.disp && <VisitPill status={visit.disp} />}
            {visit.visitStatus && <VisitPill status={visit.visitStatus} />}
            {visit.approvalStatus && <VisitPill status={visit.approvalStatus} />}
            {allocation?.npaFlagged && (
              <span className="ds-pill is-danger" style={{ fontWeight: 600 }}>
                <AlertCircle size={12} style={{ marginRight: 4 }} /> NPA
              </span>
            )}
          </div>
        </div>

        <div className="ld-facts">
          {allocation?.outstandingAmount != null && (
            <div className="ld-fact is-lead">
              <span className="ld-fact-label"><IndianRupee size={11} /> POS outstanding</span>
              <span className="ld-fact-value">{fmtINR(allocation.outstandingAmount)}</span>
            </div>
          )}
          {allocation?.totalDue != null && (
            <div className="ld-fact">
              <span className="ld-fact-label">Total due</span>
              <span className="ld-fact-value">{fmtINR(allocation.totalDue)}</span>
            </div>
          )}
          <div className="ld-fact">
            <span className="ld-fact-label"><Calendar size={11} /> Visit date</span>
            <span className="ld-fact-value">{fmtDate(visit.visitDate)}</span>
            {visit.visitTime && <span className="ld-fact-note">{fmtDT(visit.visitTime)}</span>}
          </div>
          <div className="ld-fact">
            <span className="ld-fact-label">Field officer</span>
            <span className="ld-fact-value">{visit.agentName ?? 'Unknown agent'}</span>
          </div>
          {visit.amountCollected != null && (
            <div className="ld-fact">
              <span className="ld-fact-label"><Banknote size={11} /> Collected</span>
              <span className="ld-fact-value">{fmtINR(visit.amountCollected)}</span>
              {visit.paymentMode && <span className="ld-fact-note">{visit.paymentMode.replace(/_/g, ' ')}</span>}
            </div>
          )}
        </div>
      </header>

      {/* ── Detail sheet — no inner scroller; it grows and the page scrolls ── */}
      <div className="ld-sheet">

            <Section icon={Calendar} label="Visit information">
              <dl className="ld-grid">
                {visit.nextVisitDate && <Field label="Promise to pay">{fmtDate(visit.nextVisitDate)}</Field>}
                {visit.rescheduleReason && <Field label="Reschedule reason">{visit.rescheduleReason}</Field>}
                <Field label="Created">{fmtDT(visit.createdAt)}</Field>
              </dl>
            </Section>

            {hasAssessment && (
              <Section icon={CheckCircle2} label="Field assessment">
                <dl className="ld-grid">
                  {visit.contactability && <Field label="Contactability">{visit.contactability.replace(/_/g, ' ')}</Field>}
                  {visit.residenceStatus && <Field label="Residence status">{visit.residenceStatus.replace(/_/g, ' ')}</Field>}
                  {visit.officeStatus && <Field label="Office status">{visit.officeStatus.replace(/_/g, ' ')}</Field>}
                  {visit.classificationCode && <Field label="Classification">{visit.classificationCode}</Field>}
                  {visit.reasonForDefault && <Field label="Reason for default">{visit.reasonForDefault.replace(/_/g, ' ')}</Field>}
                  {visit.customerProfile && <Field label="Customer profile">{visit.customerProfile}</Field>}
                </dl>
              </Section>
            )}

            {(visit.contactPerson || visit.contactNumber) && (
              <Section icon={Phone} label="Contact">
                <dl className="ld-grid">
                  {visit.contactPerson && <Field label="Contact person">{visit.contactPerson}</Field>}
                  {visit.contactNumber && <Field label="Contact number">{visit.contactNumber}</Field>}
                </dl>
              </Section>
            )}

            {visit.amountCollected != null && (
              <Section icon={Banknote} label="Payment proof">
                <div style={{ padding: '4px 0 8px' }}>
                  {proofLoading ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-tertiary)' }}>
                      <Loader2 size={12} className="ds-spin" /> Loading…
                    </span>
                  ) : docs.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--ink-tertiary)', fontStyle: 'italic', margin: 0 }}>No proof attached</p>
                  ) : (
                    <div className="vis-photo-grid">
                      {docs.map(doc => (
                        <button key={doc.id} type="button" onClick={() => setLightboxUrl(doc.viewUrl)} className="vis-photo" title={doc.originalFilename}>
                          <img src={doc.viewUrl} alt={doc.originalFilename ?? 'Payment proof'} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
            )}

            {(hasGPS || visit.gpsAddress) && (
              <Section icon={Navigation} label="GPS location">
                <dl className="ld-grid">
                  {visit.gpsAddress && <Field label="Address">{visit.gpsAddress}</Field>}
                  {hasGPS && (
                    <Field label="Coordinates">
                      <a href={`https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`} target="_blank" rel="noreferrer"
                        style={{ color: 'var(--ink-solid)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} />{`${Number(visit.latitude).toFixed(6)}, ${Number(visit.longitude).toFixed(6)}`}
                      </a>
                    </Field>
                  )}
                  {visit.gpsAccuracy != null && <Field label="Accuracy">±{Number(visit.gpsAccuracy).toFixed(1)} m</Field>}
                </dl>
              </Section>
            )}

            {(imgLoading || img1 || img2) && (
              <Section icon={Camera} label="Visit photos">
                {imgLoading ? (
                  <div style={{ display: 'flex', gap: 8, padding: '4px 0 8px' }}>
                    <div className="ds-skel" style={{ width: 96, height: 96 }} />
                    <div className="ds-skel" style={{ width: 96, height: 96 }} />
                  </div>
                ) : (img1 || img2) ? (
                  <div className="vis-photo-grid" style={{ padding: '4px 0 8px' }}>
                    {img1 && <button type="button" onClick={() => setLightboxUrl(img1)} className="vis-photo"><img src={img1} alt="Visit photo 1" /></button>}
                    {img2 && <button type="button" onClick={() => setLightboxUrl(img2)} className="vis-photo"><img src={img2} alt="Visit photo 2" /></button>}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--ink-tertiary)', padding: '4px 0 8px', margin: 0 }}>No photos available</p>
                )}
              </Section>
            )}

            {session && (
              <Section icon={Route} label="Field visit timeline">
                <dl className="ld-grid">
                  <Field label="Total duration">{fmtMins(diffMins(session.startedAt, session.closedAt ?? new Date().toISOString()))}</Field>
                  <Field label="Distance">{fmtKm(session.distanceMetres)}</Field>
                  <Field label="Source">{session.source}</Field>
                </dl>
                <div style={{ position: 'relative', paddingLeft: 28, padding: '12px 0 12px 28px' }}>
                  <div style={{ position: 'absolute', left: 7, top: 16, bottom: 16, width: 2, background: 'var(--border-subtle)' }} />
                  <TimelineStep color="var(--info)" label="Started" time={fmtTime(session.startedAt)}
                    gps={<GpsPin lat={session.startedLat} lng={session.startedLng} />}
                    gap={session.reachedAt ? `${fmtMins(diffMins(session.startedAt, session.reachedAt))} transit` : null} />
                  {session.reachedAt && (
                    <TimelineStep color="var(--success)" label="Reached" time={fmtTime(session.reachedAt)}
                      gps={<GpsPin lat={session.reachedLat} lng={session.reachedLng} />}
                      gap={session.waitingSince ? `${fmtMins(diffMins(session.reachedAt, session.waitingSince))} before waiting` : null} />
                  )}
                  {session.waitingSince && (
                    <TimelineStep color="var(--warning)" label="Waiting" time={fmtTime(session.waitingSince)} gps={null}
                      gap={session.closedAt ? `waited ${fmtMins(diffMins(session.waitingSince, session.closedAt))}` : 'still waiting'} />
                  )}
                  {session.closedAt && (
                    <TimelineStep color={session.status === 'ABANDONED' ? 'var(--danger)' : 'var(--text-tertiary)'}
                      label={session.status === 'ABANDONED' ? 'Abandoned' : 'Closed'}
                      time={fmtTime(session.closedAt)} gps={null} gap={null} last />
                  )}
                </div>
              </Section>
            )}

            {hasApprovalDetail && (
              <Section icon={CheckCircle2} label="Approval">
                <dl className="ld-grid">
                  {visit.approvalRemarks && <Field label="Remarks">{visit.approvalRemarks}</Field>}
                  {visit.approvedAt && <Field label="Approved at">{fmtDT(visit.approvedAt)}</Field>}
                </dl>
              </Section>
            )}

            {hasNotes && (
              <Section icon={MessageSquare} label="Notes &amp; feedback">
                <dl className="ld-grid">
                  {visit.visitNotes && <Field label="Visit notes">{visit.visitNotes}</Field>}
                  {visit.fieldUpdateFeedback && <Field label="Agent feedback">{visit.fieldUpdateFeedback}</Field>}
                  {visit.internalRemarks && <Field label="Internal remarks">{visit.internalRemarks}</Field>}
                </dl>
              </Section>
            )}

            {visit.lastVisitedAddress && (
              <Section icon={MapPin} label="Last known address">
                <dl className="ld-grid">
                  <Field label="Address">{visit.lastVisitedAddress}</Field>
                </dl>
              </Section>
            )}

            {allocation && (segment || branch || product) && (
              <Section icon={FileText} label="Loan information">
                <dl className="ld-grid">
                  {segment && <Field label="Segment">{segment}</Field>}
                  {branch && <Field label="Branch">{branch}</Field>}
                  {product && <Field label="Product">{product}</Field>}
                </dl>
              </Section>
            )}

      </div>
    </div>
  );
}

function TimelineStep({ color, label, time, gps, gap, last }: {
  color: string; label: string; time: string;
  gps: ReactNode; gap: string | null; last?: boolean;
}) {
  return (
    <div style={{ position: 'relative', marginBottom: last ? 0 : 24 }}>
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
      {gap && <div style={{ marginTop: 4, fontSize: 11, color: 'var(--ink-tertiary)', fontStyle: 'italic' }}>{gap}</div>}
    </div>
  );
}
