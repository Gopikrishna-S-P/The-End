import type { RefObject } from 'react';
import type { ElementType, ReactNode } from 'react';
import { Camera, Loader2, MapPin, Clock, Banknote, Calendar, X, CreditCard, User, Phone, RefreshCw } from 'lucide-react';
import type { PaymentMode } from '../types';

export type Disp = 'PTP' | 'PAID' | 'NC_SKIP' | 'RTP' | 'FOLLOW_UP';
export type Contactability =
  | 'CONTACTED_AT_RESIDENCE'
  | 'CONTACTED_AT_OFFICE'
  | 'CONTACTABLE_AT_BOTH_PLACES'
  | 'CONTACTABLE_ON_PHONE_ONLY'
  | 'NON_CONTACTABLE';
export interface Coords { lat: number; lng: number; accuracy: number; }

const PAYMENT_MODES: PaymentMode[] = ['CASH', 'UPI', 'CHEQUE', 'NEFT', 'RTGS'];
const MAX_PTP_DAYS = 90;

// toISOString() converts to UTC first, which returns the wrong calendar date
// for IST users between 00:00-05:29 IST. Format directly in IST instead.
function istDateString(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400_000);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
}

export function Checklist({ title, icon: Icon, ok, optional, children }: {
  title: string; icon: ElementType; ok: boolean; optional?: boolean; children: ReactNode;
}) {
  return (
    <div className="ds-card is-pad" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="ds-card-head" style={{ gap: '8px', marginBottom: '12px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', font: '600 10.5px var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', color: ok ? 'var(--success)' : 'var(--text-tertiary)' }}>
          <Icon size={13} />{title}
        </div>
        {!optional && (
          <span className="ds-pill is-bare" style={{ background: ok ? 'var(--success-subtle)' : 'var(--warning-subtle)', color: ok ? 'var(--success)' : 'var(--warning)', border: ok ? '1px solid var(--success-border)' : '1px solid var(--warning-border)', padding: '2px 8px' }}>
            {ok ? 'OK' : 'Required'}
          </span>
        )}
        {optional && ok  && <span className="ds-pill is-bare" style={{ background: 'var(--success-subtle)', color: 'var(--success)', border: '1px solid var(--success-border)', padding: '2px 8px' }}>Filled</span>}
        {optional && !ok && <span className="ds-pill is-bare" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)', border: '1px solid var(--border)', padding: '2px 8px' }}>Optional</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>{children}</div>
    </div>
  );
}

interface GpsProps {
  coords: Coords | null;
  gpsError: string | null;
  gpsAccurate: boolean;
  isMobile: boolean;
  GPS_ACCURACY_THRESHOLD_M: number;
  onRetry?: () => void;
}
export function GpsChecklist({ coords, gpsError, gpsAccurate, isMobile, GPS_ACCURACY_THRESHOLD_M, onRetry }: GpsProps) {
  return (
    <Checklist title="GPS Location" icon={MapPin} ok={gpsAccurate}>
      {coords ? (
        <>
          <p style={{ margin: 0, font: '11.5px var(--font-mono)', color: 'var(--text-secondary)' }}>
            {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)} · ±{Math.round(coords.accuracy)} m
          </p>
          {!gpsAccurate && (
            <div style={{ padding: '8px 12px', background: 'var(--warning-subtle)', border: '1px solid var(--warning-border)', color: 'var(--warning)', borderRadius: 'var(--radius-sm)', fontSize: '12px', lineHeight: 1.45 }}>
              Accuracy ±{Math.round(coords.accuracy)} m — must be ≤{GPS_ACCURACY_THRESHOLD_M} m.
              {isMobile ? ' Move to an open area.' : ' Move closer to a window.'}
            </div>
          )}
        </>
      ) : gpsError ? (
        <>
          <div style={{ padding: '8px 12px', background: 'var(--danger-subtle)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '12px', lineHeight: 1.45 }}>
            {gpsError}
          </div>
          {onRetry && (
            <button type="button" className="ds-btn is-secondary is-sm" onClick={onRetry}>
              <RefreshCw size={12} /> Request permission
            </button>
          )}
        </>
      ) : (
        <p style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
          <Loader2 size={13} className="ds-spin" /> Acquiring GPS lock…
        </p>
      )}
    </Checklist>
  );
}

interface PhotosProps {
  selfieImage: File | null;
  envImage: File | null;
  selfieRef: RefObject<HTMLInputElement | null>;
  envRef: RefObject<HTMLInputElement | null>;
  onCaptureSelfie: (files: FileList | null) => void;
  onCaptureEnv: (files: FileList | null) => void;
  onRemoveSelfie: () => void;
  onRemoveEnv: () => void;
}
export function PhotosChecklist({ selfieImage, envImage, selfieRef, envRef, onCaptureSelfie, onCaptureEnv, onRemoveSelfie, onRemoveEnv }: PhotosProps) {
  const ok = !!selfieImage && !!envImage;
  const slotLabel: React.CSSProperties = { font: '600 10px var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' };
  const thumb: React.CSSProperties = { position: 'relative', width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' };
  const removeBtn: React.CSSProperties = { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'var(--text-primary)', color: 'var(--text-on-solid)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0.85 };

  return (
    <Checklist title="Photos" icon={Camera} ok={ok}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>

        {/* Selfie — front camera */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={slotLabel}>Selfie</span>
          <input ref={selfieRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }}
            onChange={(e) => onCaptureSelfie(e.target.files)} />
          {selfieImage ? (
            <div style={thumb}>
              <img src={URL.createObjectURL(selfieImage)} alt="Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button type="button" onClick={onRemoveSelfie} aria-label="Remove selfie" style={removeBtn}>
                <X size={11} />
              </button>
            </div>
          ) : (
            <button type="button" className="ds-btn is-secondary is-sm" style={{ justifyContent: 'center' }}
              onClick={() => selfieRef.current?.click()}>
              <User size={13} /> Selfie
            </button>
          )}
        </div>

        {/* Site photo — back camera */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={slotLabel}>Site photo</span>
          <input ref={envRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
            onChange={(e) => onCaptureEnv(e.target.files)} />
          {envImage ? (
            <div style={thumb}>
              <img src={URL.createObjectURL(envImage)} alt="Site" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button type="button" onClick={onRemoveEnv} aria-label="Remove site photo" style={removeBtn}>
                <X size={11} />
              </button>
            </div>
          ) : (
            <button type="button" className="ds-btn is-secondary is-sm" style={{ justifyContent: 'center' }}
              onClick={() => envRef.current?.click()}>
              <Camera size={13} /> Site
            </button>
          )}
        </div>

      </div>
    </Checklist>
  );
}

export interface PaymentFields {
  paymentMode: PaymentMode;
  upiRef: string;
  chequeNumber: string;
  chequeDate: string;
  bankName: string;
  txnRef: string;
  paymentProof: File | null;
  cashAcknowledged: boolean;
}
export interface PaymentFieldSetters {
  setPaymentMode: (v: PaymentMode) => void;
  setUpiRef: (v: string) => void;
  setChequeNumber: (v: string) => void;
  setChequeDate: (v: string) => void;
  setBankName: (v: string) => void;
  setTxnRef: (v: string) => void;
  setPaymentProof: (v: File | null) => void;
  setCashAcknowledged: (v: boolean) => void;
}

interface OutcomeProps {
  disp: Disp | '';
  collectedAmount: string;  setCollectedAmount: (v: string) => void;
  ptpDate: string;          setPtpDate: (v: string) => void;
  ptpAmount: string;        setPtpAmount: (v: string) => void;
  payment: PaymentFields;   setters: PaymentFieldSetters;
  allowedPaymentModes?: PaymentMode[];
}
export function OutcomeExtraFields({
  disp, collectedAmount, setCollectedAmount,
  ptpDate, setPtpDate, ptpAmount, setPtpAmount,
  payment, setters, allowedPaymentModes,
}: OutcomeProps) {
  const proofRef: RefObject<HTMLInputElement | null> = { current: null };

  if (disp === 'PAID') {
    const amtOk  = !!collectedAmount && Number(collectedAmount) > 0;
    const proofOk = !!payment.paymentProof;
    const cashOk = payment.paymentMode !== 'CASH' || payment.cashAcknowledged;

    return (
      <Checklist title="Payment details" icon={Banknote} ok={amtOk && proofOk && cashOk}>
        <div className="ds-field">
          <label className="ds-label is-required">Amount collected (₹)</label>
          <input
            type="number" min="1"
            value={collectedAmount}
            onChange={(e) => setCollectedAmount(e.target.value)}
            placeholder="0"
            className="ds-input"
            style={{ font: '700 24px var(--font-mono)', fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}
          />
        </div>

        <div className="ds-field">
          <label className="ds-label">Payment mode</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {(allowedPaymentModes || PAYMENT_MODES).map((m) => (
              <button
                key={m} type="button"
                className={`ds-btn ${payment.paymentMode === m ? 'is-primary' : 'is-secondary'}`}
                style={{ height: 30, borderRadius: 'var(--radius-full)', padding: '0 14px', fontSize: 12 }}
                onClick={() => { setters.setPaymentMode(m); if (m !== 'CASH') setters.setCashAcknowledged(false); }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {payment.paymentMode === 'UPI' && (
          <div className="ds-field">
            <label className="ds-label">UPI reference ID</label>
            <input type="text" inputMode="numeric" placeholder="12-digit reference"
              value={payment.upiRef} onChange={(e) => setters.setUpiRef(e.target.value)} className="ds-input" />
          </div>
        )}

        {payment.paymentMode === 'CHEQUE' && (
          <>
            <div className="ds-field">
              <label className="ds-label">Cheque number</label>
              <input type="text" inputMode="numeric" placeholder="6-digit cheque number"
                value={payment.chequeNumber} onChange={(e) => setters.setChequeNumber(e.target.value)} className="ds-input" />
            </div>
            <div className="ds-section-grid is-cols-2">
              <div className="ds-field">
                <label className="ds-label">Cheque date</label>
                <input type="date" value={payment.chequeDate} onChange={(e) => setters.setChequeDate(e.target.value)} className="ds-input" />
              </div>
              <div className="ds-field">
                <label className="ds-label">Bank name</label>
                <input type="text" placeholder="Bank name"
                  value={payment.bankName} onChange={(e) => setters.setBankName(e.target.value)} className="ds-input" />
              </div>
            </div>
          </>
        )}

        {(payment.paymentMode === 'NEFT' || payment.paymentMode === 'RTGS') && (
          <div className="ds-section-grid is-cols-2">
            <div className="ds-field">
              <label className="ds-label">Bank name</label>
              <input type="text" placeholder="Bank name"
                value={payment.bankName} onChange={(e) => setters.setBankName(e.target.value)} className="ds-input" />
            </div>
            <div className="ds-field">
              <label className="ds-label">UTR / Transaction ref</label>
              <input type="text" placeholder="UTR number"
                value={payment.txnRef} onChange={(e) => setters.setTxnRef(e.target.value.toUpperCase())} className="ds-input" />
            </div>
          </div>
        )}

        <div className="ds-field">
          <label className="ds-label is-required">Payment proof photo</label>
          <input ref={proofRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
            onChange={(e) => setters.setPaymentProof(e.target.files?.[0] ?? null)} />
          {payment.paymentProof ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={URL.createObjectURL(payment.paymentProof)} alt="Payment proof" style={{ width: 68, height: 68, borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--border)' }} />
              <button type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', font: '500 12px var(--font-sans)', color: 'var(--danger)', padding: 0 }} onClick={() => setters.setPaymentProof(null)}>
                <X size={11} /> Remove
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <button type="button" className="ds-btn is-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => proofRef.current?.click()}>
                <Camera size={13} /> Camera
              </button>
              <button type="button" className="ds-btn is-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => {
                const inp = document.createElement('input');
                inp.type = 'file'; inp.accept = 'image/*';
                inp.onchange = () => setters.setPaymentProof(inp.files?.[0] ?? null);
                inp.click();
              }}>
                <CreditCard size={13} /> Gallery
              </button>
            </div>
          )}
          {!payment.paymentProof && (
            <div style={{ padding: '8px 12px', background: 'var(--danger-subtle)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '12px', lineHeight: 1.45 }}>Required for collection approval.</div>
          )}
        </div>

        {payment.paymentMode === 'CASH' && (
          <label style={{ display: 'block', background: 'color-mix(in srgb, var(--warning) 5%, var(--bg-surface))', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-sm)', padding: '12px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div
                role="checkbox"
                aria-checked={payment.cashAcknowledged}
                tabIndex={0}
                onClick={() => setters.setCashAcknowledged(!payment.cashAcknowledged)}
                onKeyDown={(e) => e.key === ' ' && setters.setCashAcknowledged(!payment.cashAcknowledged)}
                style={{ width: 18, height: 18, borderRadius: 'var(--radius-xs)', border: payment.cashAcknowledged ? '2px solid var(--ink-solid)' : '2px solid var(--warning)', background: payment.cashAcknowledged ? 'var(--ink-solid)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', marginTop: 1, color: 'var(--text-on-solid)', fontSize: 12, fontWeight: 700 }}
              >
                {payment.cashAcknowledged && <span>✓</span>}
              </div>
              <span style={{ font: '12.5px/1.5 var(--font-sans)', color: 'var(--text-primary)' }}>
                I am physically holding this cash and will deposit it per the organisation's cash-handling policy.
              </span>
            </div>
          </label>
        )}
      </Checklist>
    );
  }

  if (disp === 'PTP') {
    const ok = !!(ptpDate && ptpAmount && Number(ptpAmount) > 0);
    return (
      <Checklist title="Promise to Pay" icon={Calendar} ok={ok}>
        <div className="ds-section-grid is-cols-2">
          <div className="ds-field">
            <label className="ds-label is-required">Promised date</label>
            <input
              type="date"
              value={ptpDate}
              min={istDateString(1)}
              max={istDateString(MAX_PTP_DAYS)}
              onChange={(e) => setPtpDate(e.target.value)}
              className="ds-input"
            />
          </div>
          <div className="ds-field">
            <label className="ds-label is-required">Promised amount (₹)</label>
            <input
              type="number" min="1" placeholder="0"
              value={ptpAmount}
              onChange={(e) => setPtpAmount(e.target.value)}
              className="ds-input"
              style={{ font: '700 24px var(--font-mono)', fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}
            />
          </div>
        </div>
      </Checklist>
    );
  }

  return null;
}

interface ContactDetailsProps {
  contactPerson: string;  setContactPerson: (v: string) => void;
  contactNumber: string;  setContactNumber: (v: string) => void;
}
export function ContactDetailsFields({ contactPerson, setContactPerson, contactNumber, setContactNumber }: ContactDetailsProps) {
  const ok = !!(contactPerson.trim() && contactNumber.trim());
  return (
    <Checklist title="Contact person" icon={User} ok={ok}>
      <div className="ds-field">
        <label className="ds-label is-required">Name</label>
        <input type="text" placeholder="Person met during visit"
          value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className="ds-input" />
      </div>
      <div className="ds-field">
        <label className="ds-label is-required">Phone number</label>
        <input type="tel" placeholder="+91 XXXXX XXXXX"
          value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className="ds-input" />
      </div>
    </Checklist>
  );
}

interface AfterHoursProps { overrideReason: string; setOverrideReason: (v: string) => void; }
export function AfterHoursOverride({ overrideReason, setOverrideReason }: AfterHoursProps) {
  return (
    <div className="ds-card is-pad" style={{ background: 'var(--warning-subtle)', borderColor: 'var(--warning-border)' }} role="region">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', font: '13px var(--font-sans)', color: 'var(--warning)', fontWeight: 600 }}>
          <Clock size={15} />
          <span>Outside calling hours (08:00–19:00 IST)</span>
        </div>
        <span className="ds-pill is-bare" style={{ background: overrideReason.trim() ? 'var(--success-subtle)' : 'var(--warning-subtle)', color: overrideReason.trim() ? 'var(--success)' : 'var(--warning)', border: overrideReason.trim() ? '1px solid var(--success-border)' : '1px solid var(--warning-border)', padding: '2px 8px' }}>
          {overrideReason.trim() ? 'OK' : 'Required'}
        </span>
      </div>
      <p style={{ margin: '0 0 10px 0', font: '12.5px var(--font-sans)', color: 'var(--text-secondary)' }}>A supervisor override reason is required to log this visit.</p>
      <textarea rows={2} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)}
        placeholder="Enter supervisor override reason…" className="ds-textarea" />
    </div>
  );
}
