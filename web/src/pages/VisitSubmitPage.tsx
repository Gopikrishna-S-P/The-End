import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { apiClient, unwrapApiResponse } from '../client';
import { visitsApi } from '../api/visitsApi';
import { collectionsApi } from '../api/collectionsApi';
import { nonContactablesApi } from '../api/nonContactablesApi';
import { useAuth } from '../AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import type { AllocationResponse, PaymentMode } from '../types';
import { ArrowLeft, AlertCircle, CheckCircle2, FileText, Phone } from 'lucide-react';
import {
  type Disp, type Contactability, type Coords,
  type PaymentFields, type PaymentFieldSetters,
  GpsChecklist, PhotosChecklist, OutcomeExtraFields,
  ContactDetailsFields, AfterHoursOverride, Checklist,
} from './VisitSubmitHelpers';
import '../styles/AppPage.css';
import '../styles/VisitSubmitPage.css';
import '../pages/Dashboard.css';
const MAX_PTP_DAYS = 90;

// toISOString() converts to UTC first, which returns the wrong calendar date
// for IST users between 00:00-05:29 IST. Format directly in IST instead.
function istDateString(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400_000);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.06 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};
const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.24, ease: 'easeOut' as const } },
};

export default function VisitSubmitPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canSubmit = hasPermission('VISIT_SUBMIT');

  const [allocation, setAllocation]           = useState<AllocationResponse | null>(null);
  const [coords, setCoords]                   = useState<Coords | null>(null);
  const [gpsError, setGpsError]               = useState<string | null>(null);
  const [selfieImage, setSelfieImage]         = useState<File | null>(null);
  const [envImage, setEnvImage]               = useState<File | null>(null);
  const [disp, setDisp]                       = useState<Disp | ''>('');
  const [contact, setContact]                 = useState<Contactability | ''>('');
  const [notes, setNotes]                     = useState('');

  const [collectedAmount, setCollectedAmount] = useState('');
  const [paymentMode, setPaymentMode]         = useState<PaymentMode>('CASH');
  const [upiRef, setUpiRef]                   = useState('');
  const [chequeNumber, setChequeNumber]       = useState('');
  const [chequeDate, setChequeDate]           = useState('');
  const [bankName, setBankName]               = useState('');
  const [txnRef, setTxnRef]                   = useState('');
  const [paymentProof, setPaymentProof]       = useState<File | null>(null);
  const [cashAcknowledged, setCashAcknowledged] = useState(false);

  const [ptpDate, setPtpDate] = useState(
    () => istDateString(7),
  );
  const [ptpAmount, setPtpAmount] = useState('');

  const rawAllowed = allocation?.dynamicData?.allowedPaymentModes;
  const allowedPaymentModes = (Array.isArray(rawAllowed) && rawAllowed.length > 0)
    ? (rawAllowed as PaymentMode[])
    : (['CASH', 'UPI', 'CHEQUE', 'NEFT', 'RTGS'] as PaymentMode[]);

  useEffect(() => {
    if (allowedPaymentModes.length > 0 && !allowedPaymentModes.includes(paymentMode)) {
      setPaymentMode(allowedPaymentModes[0]);
    }
  }, [allowedPaymentModes, paymentMode]);

  const [contactPerson, setContactPerson] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const envRef = useRef<HTMLInputElement>(null);
  const watchRef = useRef<number | null>(null);

  const isOutsideHours = false;
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const GPS_ACCURACY_THRESHOLD_M = isMobile ? 50 : 200;
  const gpsAccurate = !!coords && coords.accuracy <= GPS_ACCURACY_THRESHOLD_M;

  const photosOk = !!selfieImage && !!envImage;
  const paidOk = disp !== 'PAID' || (
    !!collectedAmount && Number(collectedAmount) > 0 &&
    !!paymentProof &&
    (paymentMode !== 'CASH' || cashAcknowledged)
  );
  const ptpOk = disp !== 'PTP' || (!!ptpDate && !!ptpAmount && Number(ptpAmount) > 0);
  const ready = gpsAccurate && photosOk && !!disp && !!contact && !submitting
    && (!isOutsideHours || overrideReason.trim().length > 0)
    && paidOk && ptpOk
    && notes.trim().length > 0
    && contactPerson.trim().length > 0
    && contactNumber.trim().length > 0;

  const startGpsWatch = useCallback(() => {
    if (!('geolocation' in navigator)) { setGpsError('GPS not available on this device.'); return; }
    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }); setGpsError(null); },
      (err) => {
        setGpsError(err.message || 'GPS permission denied.');
        if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );
  }, []);

  const requestGps = useCallback(() => {
    setGpsError(null);
    setCoords(null);
    startGpsWatch();
  }, [startGpsWatch]);

  useEffect(() => {
    if (!caseId) return;
    apiClient.get(`/api/v1/allocations/${caseId}`)
      .then(({ data }) => setAllocation(unwrapApiResponse<AllocationResponse>(data)))
      .catch(() => setError('Could not load this case.'));
    startGpsWatch();
    return () => { if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; } };
  }, [caseId, startGpsWatch]);

  const validate = (): string | null => {
    if (!coords || !gpsAccurate) return 'GPS lock required. Wait for accuracy ≤' + GPS_ACCURACY_THRESHOLD_M + ' m.';
    if (!contact || !disp) return 'Select contactability and disposition.';
    if (!photosOk) return 'Selfie and site photo are required.';
    if (isOutsideHours && !overrideReason.trim()) return 'Supervisor override reason required outside 08:00–19:00 IST.';
    if (disp === 'PAID') {
      if (!collectedAmount || Number(collectedAmount) <= 0) return 'Enter amount collected.';
      if (!paymentProof) return 'Payment proof photo required.';
      if (paymentMode === 'CASH' && !cashAcknowledged) return 'Acknowledge cash handling policy.';
    }
    if (disp === 'PTP') {
      if (!ptpAmount || Number(ptpAmount) <= 0) return 'Enter promised amount.';
      if (!ptpDate) return 'Select promised date.';
      const d = new Date(ptpDate);
      const tomorrow = new Date(Date.now() + 86400_000); tomorrow.setHours(0, 0, 0, 0);
      const maxDate = new Date(Date.now() + MAX_PTP_DAYS * 86400_000);
      if (d < tomorrow) return 'Promised date must be at least tomorrow.';
      if (d > maxDate) return `Promised date must be within ${MAX_PTP_DAYS} days.`;
    }
    if (!contactPerson.trim()) return 'Contact person name is required.';
    if (!contactNumber.trim()) return 'Contact phone number is required.';
    if (!notes.trim()) return 'Visit notes are required.';
    return null;
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    if (!caseId || !coords) return;
    setSubmitting(true); setError(null);
    try {
      const allImages = [selfieImage, envImage].filter((f): f is File => f !== null);
      const visit = await visitsApi.submitVisit(
        {
          allocationId: caseId,
          visitDate: istDateString(),
          latitude: coords.lat, longitude: coords.lng, gpsAccuracy: coords.accuracy,
          disp: disp || undefined,
          contactability: contact || undefined,
          visitNotes: notes || undefined,
          contactPerson: contactPerson.trim() || undefined,
          contactNumber: contactNumber.trim() || undefined,
          amountCollected: disp === 'PAID' && collectedAmount ? Number(collectedAmount) : undefined,
          paymentMode: disp === 'PAID' ? paymentMode : undefined,
          afterHoursOverrideReason: isOutsideHours && overrideReason.trim() ? overrideReason.trim() : undefined,
        },
        allImages,
      );
      const visitId = visit?.id;
      const agentName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();

      if (disp === 'PAID' && visitId) {
        const col = await collectionsApi.submitCollection({
          allocationId: caseId, visitId,
          organizationId: user?.organizationId ?? '',
          amount: Number(collectedAmount), paymentMode,
          collectionDate: istDateString(),
          idempotencyKey: crypto.randomUUID(),
          chequeNumber: paymentMode === 'CHEQUE' ? chequeNumber || undefined : undefined,
          chequeDate: paymentMode === 'CHEQUE' ? chequeDate || undefined : undefined,
          bankName: ['CHEQUE', 'NEFT', 'RTGS'].includes(paymentMode) ? bankName || undefined : undefined,
          upiReferenceId: paymentMode === 'UPI' ? upiRef || undefined : undefined,
          transactionReferenceId: ['NEFT', 'RTGS'].includes(paymentMode) ? txnRef || undefined : undefined,
        });
        if (col?.id && paymentProof) {
          const form = new FormData();
          form.append('file', paymentProof, paymentProof.name || 'payment_proof.jpg');
          apiClient.post(`/api/v1/collections/${col.id}/documents`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          }).catch(() => {});
        }
      } else if (disp === 'PTP') {
        await apiClient.post('/api/v1/ptps', {
          allocationId: caseId, visitId, agentId: user?.id, agentName,
          loanNumber: allocation?.loanNumber, borrowerName: allocation?.borrowerName,
          promisedDate: ptpDate, promisedAmount: Number(ptpAmount),
        });
      } else if (disp === 'NC_SKIP' || disp === 'RTP' || contact === 'NON_CONTACTABLE') {
        await nonContactablesApi.create({
          allocationId: caseId, visitId,
          reason: disp === 'RTP' ? 'REFUSED' : 'ABSENT',
          notes: notes || undefined,
        });
      }

      navigate('/app/today', { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to submit visit.');
    } finally { setSubmitting(false); }
  };

  const payment: PaymentFields = { paymentMode, upiRef, chequeNumber, chequeDate, bankName, txnRef, paymentProof, cashAcknowledged };
  const setters: PaymentFieldSetters = { setPaymentMode, setUpiRef, setChequeNumber, setChequeDate, setBankName, setTxnRef, setPaymentProof, setCashAcknowledged };

  return (
    <div className="dd-page" style={{ background: 'var(--bg-canvas)' }}>
      {/* ── Page header ── */}
      <div className="dd-page-header">
        <div className="dd-page-titles">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" onClick={() => navigate(-1)} className="ds-btn is-secondary is-sm">
              <ArrowLeft size={16} />
            </button>
            <h1 className="dd-page-title" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              Submit Visit
              <span className="dd-page-context">Record field interaction and outcome</span>
            </h1>
          </div>
        </div>
        <div className="dd-page-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AnimatePresence>
            {ready && canSubmit && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="ds-btn is-primary"
                  style={{ minWidth: 120 }}
                >
                  {submitting ? 'Submitting…' : 'Submit Visit'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="dd-main-container" style={{ overflowY: 'auto', padding: '0 8px 32px' }}>
        <AnimatePresence>
          {error && (
            <motion.div className="dd-error-banner" role="alert" style={{ marginBottom: 24, flexShrink: 0 }}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <AlertCircle size={16} className="dd-error-icon" />
              <div className="dd-error-body">
                <span className="dd-error-title">Submission failed</span>
                <span className="dd-error-sub">{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', maxWidth: '1200px', margin: '0 auto', alignItems: 'start' }}>
          
          {/* ── Left Column: Context & Metadata ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {allocation && (
              <motion.div variants={fadeIn} initial="hidden" animate="show" className="ds-card is-pad">
                <div className="ds-card-head" style={{ justifyContent: 'flex-start', margin: 0, padding: 0, border: 'none' }}>
                  <div className="ds-card-title" style={{ fontSize: 18 }}>{allocation.borrowerName}</div>
                  <div className="ds-card-sub" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    {allocation.loanNumber && <span>Loan #{allocation.loanNumber}</span>}
                    {allocation.loanAccountNo && !allocation.loanNumber && <span>{allocation.loanAccountNo}</span>}
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div variants={fadeUp}>
              <GpsChecklist
                coords={coords} gpsError={gpsError} gpsAccurate={gpsAccurate}
                isMobile={isMobile} GPS_ACCURACY_THRESHOLD_M={GPS_ACCURACY_THRESHOLD_M}
                onRetry={requestGps}
              />
            </motion.div>

            <motion.div variants={fadeUp}>
              <PhotosChecklist
                selfieImage={selfieImage} envImage={envImage}
                selfieRef={selfieRef} envRef={envRef}
                onCaptureSelfie={(files) => setSelfieImage(files?.[0] ?? null)}
                onCaptureEnv={(files) => setEnvImage(files?.[0] ?? null)}
                onRemoveSelfie={() => setSelfieImage(null)}
                onRemoveEnv={() => setEnvImage(null)}
              />
            </motion.div>

            {isOutsideHours && (
              <motion.div variants={fadeUp}>
                <AfterHoursOverride overrideReason={overrideReason} setOverrideReason={setOverrideReason} />
              </motion.div>
            )}
          </div>

          {/* ── Right Column: Form Data Entry ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <motion.div variants={fadeUp}>
                <Checklist title="Contactability" icon={Phone} ok={!!contact}>
                  <div className="ds-field">
                    <label className="ds-label is-required">Method of contact</label>
                    <select
                      value={contact}
                      onChange={(e) => setContact(e.target.value as Contactability)}
                      className="ds-select"
                    >
                      <option value="">— select —</option>
                      <option value="CONTACTED_AT_OFFICE">Contacted at Office</option>
                      <option value="CONTACTED_AT_RESIDENCE">Contacted at Residence</option>
                      <option value="CONTACTABLE_AT_BOTH_PLACES">Contactable at Both Places</option>
                      <option value="NON_CONTACTABLE">Non-contactable</option>
                      <option value="CONTACTABLE_ON_PHONE_ONLY">Phone only</option>
                    </select>
                  </div>
                </Checklist>
              </motion.div>

              <motion.div variants={fadeUp}>
                <Checklist title="Outcome" icon={CheckCircle2} ok={!!disp}>
                  <div className="ds-field">
                    <label className="ds-label is-required">Visit disposition</label>
                    <select
                      value={disp}
                      onChange={(e) => setDisp(e.target.value as Disp)}
                      className="ds-select"
                    >
                      <option value="">— select —</option>
                      <option value="PAID">Payment Collected</option>
                      <option value="RTP">Refused to Pay (RTP)</option>
                      <option value="NC_SKIP">NC / Skip</option>
                      <option value="PTP">Promise to Pay (PTP)</option>
                      <option value="FOLLOW_UP">Follow Up</option>
                    </select>
                  </div>
                </Checklist>
              </motion.div>
            </div>

            <AnimatePresence mode="popLayout">
              {(disp === 'PAID' || disp === 'PTP') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <OutcomeExtraFields
                    disp={disp}
                    collectedAmount={collectedAmount} setCollectedAmount={setCollectedAmount}
                    ptpDate={ptpDate} setPtpDate={setPtpDate}
                    ptpAmount={ptpAmount} setPtpAmount={setPtpAmount}
                    payment={payment} setters={setters}
                    allowedPaymentModes={allowedPaymentModes}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
              <motion.div variants={fadeUp}>
                <ContactDetailsFields
                  contactPerson={contactPerson} setContactPerson={setContactPerson}
                  contactNumber={contactNumber} setContactNumber={setContactNumber}
                />
              </motion.div>

              <motion.div variants={fadeUp}>
                <Checklist title="Notes" icon={FileText} ok={notes.trim().length > 0}>
                  <div className="ds-field">
                    <label className="ds-label is-required">Notes</label>
                    <textarea
                      rows={5}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="What happened at this visit?"
                      className="ds-textarea"
                    />
                  </div>
                </Checklist>
              </motion.div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
