import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MapPin, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '@/theme/useTheme';
import {
  Screen, Text, Button, Card, TextField, SelectField, DateField, Divider,
} from '@/components/ui';
import { PhotoPicker, type PickedPhoto } from '@/components/PhotoPicker';
import { useGpsCapture } from '@/hooks/useGpsCapture';
import { visitLogApi } from '@/api/visitLogApi';
import {
  DISP_OPTIONS, CONTACTABILITY_OPTIONS, PAYMENT_MODE_OPTIONS, REASON_FOR_DEFAULT_OPTIONS,
  CLASSIFICATION_CODE_OPTIONS, RESIDENCE_STATUS_OPTIONS, OFFICE_STATUS_OPTIONS,
} from '@/utils/visitEnumLabels';
import { todayIso } from '@/utils/date';
import { extractApiError, isNetworkError } from '@/utils/extractApiError';
import { newIdempotencyKey } from '@/api/axiosInstance';
import { enqueueVisitMetadata } from '@/utils/offlineQueue';
import type {
  ClassificationCode, Contactability, Disp, OfficeStatus, ReasonForDefault, ResidenceStatus,
} from '@/types/domain';
import type { PaymentMode } from '@/types/core';

export default function VisitFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const { fix, capturing, error: gpsError, capture } = useGpsCapture();

  const [visitDate] = useState(todayIso());
  const [contactability, setContactability] = useState<Contactability>();
  const [contactPerson, setContactPerson] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [disp, setDisp] = useState<Disp>();
  const [nextVisitDate, setNextVisitDate] = useState<string>();
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [classificationCode, setClassificationCode] = useState<ClassificationCode>();
  const [reasonForDefault, setReasonForDefault] = useState<ReasonForDefault>();
  const [amountCollected, setAmountCollected] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>();
  const [residenceStatus, setResidenceStatus] = useState<ResidenceStatus>();
  const [officeStatus, setOfficeStatus] = useState<OfficeStatus>();
  const [visitNotes, setVisitNotes] = useState('');
  const [internalRemarks, setInternalRemarks] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [showMore, setShowMore] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => { capture(); }, []);

  const onSubmit = async () => {
    setFormError(null);
    if (!id) return;
    if (!disp) { setFormError('Select a visit outcome.'); return; }
    if (!fix) { setFormError('Location is required — tap "Retry GPS" and allow location access.'); return; }
    if (disp === 'FOLLOW_UP' && !nextVisitDate) { setFormError('Pick the next visit date.'); return; }

    const payload = {
      allocationId: id,
      visitDate,
      contactability,
      contactPerson: contactPerson || undefined,
      contactNumber: contactNumber || undefined,
      disp,
      nextVisitDate: disp === 'FOLLOW_UP' ? nextVisitDate : undefined,
      rescheduleReason: disp === 'FOLLOW_UP' ? (rescheduleReason || undefined) : undefined,
      classificationCode: disp === 'NC_SKIP' ? classificationCode : undefined,
      reasonForDefault: disp === 'NC_SKIP' ? reasonForDefault : undefined,
      amountCollected: disp === 'PAID' && amountCollected ? Number(amountCollected) : undefined,
      paymentMode: disp === 'PAID' ? paymentMode : undefined,
      latitude: fix.latitude,
      longitude: fix.longitude,
      gpsAccuracy: fix.accuracy,
      gpsAltitude: fix.altitude,
      gpsAddress: fix.address,
      mockLocationDetected: fix.mockLocationDetected,
      residenceStatus,
      officeStatus,
      visitNotes: visitNotes || undefined,
      internalRemarks: internalRemarks || undefined,
    };

    const idempotencyKey = newIdempotencyKey();

    setSubmitting(true);
    try {
      const visit = await visitLogApi.create(payload, photos, idempotencyKey);

      if (!visit) {
        // Idempotent replay -- the server intentionally omits refetching the
        // original visit. Same fallback as the offline-queue path below: no
        // id available yet for PAID/PTP chaining, so just go back.
        router.back();
      } else if (disp === 'PTP') {
        router.replace({ pathname: '/case/[id]/ptp', params: { id, visitId: visit.id } });
      } else if (disp === 'PAID' && visit.amountCollected) {
        router.replace({
          pathname: '/case/[id]/collection',
          params: { id, visitId: visit.id, amount: String(visit.amountCollected), paymentMode: visit.paymentMode ?? '' },
        });
      } else {
        router.back();
      }
    } catch (e) {
      if (isNetworkError(e)) {
        if (photos.length > 0) {
          setFormError("You're offline and have photos attached — photos can't be queued. Retry once you have signal, or remove the photos to save offline.");
          return;
        }
        const queued = await enqueueVisitMetadata(payload, idempotencyKey);
        if (!queued) {
          setFormError('Too many visits waiting to sync — connect to the internet before saving more offline.');
          return;
        }
        // No server-issued visit id yet, so PAID/PTP chaining happens after this
        // visit syncs — from the case's "recent visits" list once it appears.
        router.replace({ pathname: '/case/[id]', params: { id, savedOffline: '1' } });
        return;
      }
      setFormError(extractApiError(e, 'Could not submit the visit. Try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: spacing.s4 }}>
        <Card style={{ gap: spacing.s2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.s2 }}>
              <MapPin size={16} color={fix ? colors.success : colors.ink3} />
              <Text variant="bodyMedium">{fix ? 'Location captured' : 'Capturing location…'}</Text>
            </View>
            <Button
              label="Retry GPS"
              variant="ghost"
              fullWidth={false}
              size="md"
              loading={capturing}
              onPress={capture}
              icon={<RefreshCw size={14} color={colors.accent} />}
            />
          </View>
          {fix?.address ? <Text variant="caption" color="secondary">{fix.address}</Text> : null}
          {gpsError ? <Text variant="caption" color="error">{gpsError}</Text> : null}
        </Card>

        <Card style={{ gap: spacing.s4 }}>
          <Text variant="headline">Visit details</Text>
          <Text variant="caption" color="secondary">Visit date: {visitDate}</Text>
          <SelectField label="Contactability" options={CONTACTABILITY_OPTIONS} value={contactability} onChange={setContactability} />
          <TextField label="Contact person" value={contactPerson} onChangeText={setContactPerson} placeholder="Who did you meet?" />
          <TextField label="Contact number" value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" placeholder="Optional" />
        </Card>

        <Card style={{ gap: spacing.s4 }}>
          <Text variant="headline">Outcome</Text>
          <SelectField label="Disposition" required options={DISP_OPTIONS} value={disp} onChange={setDisp} />

          {disp === 'PAID' ? (
            <>
              <TextField label="Amount collected" keyboardType="decimal-pad" value={amountCollected} onChangeText={setAmountCollected} placeholder="0" />
              <SelectField label="Payment mode" options={PAYMENT_MODE_OPTIONS} value={paymentMode} onChange={setPaymentMode} />
            </>
          ) : null}

          {disp === 'FOLLOW_UP' ? (
            <>
              <DateField label="Next visit date" required value={nextVisitDate} onChange={setNextVisitDate} minimumDate={new Date()} />
              <TextField label="Reason for reschedule" value={rescheduleReason} onChangeText={setRescheduleReason} multiline />
            </>
          ) : null}

          {disp === 'NC_SKIP' ? (
            <>
              <SelectField label="Reason for default" options={REASON_FOR_DEFAULT_OPTIONS} value={reasonForDefault} onChange={setReasonForDefault} />
              <SelectField label="Classification" options={CLASSIFICATION_CODE_OPTIONS} value={classificationCode} onChange={setClassificationCode} />
            </>
          ) : null}

          {disp === 'PTP' ? (
            <Text variant="caption" color="secondary">You&apos;ll set the promised amount and date on the next screen.</Text>
          ) : null}
        </Card>

        <Card style={{ gap: spacing.s4 }}>
          <TextField label="Visit notes" value={visitNotes} onChangeText={setVisitNotes} multiline placeholder="What happened during the visit?" />
          <PhotoPicker photos={photos} onChange={setPhotos} label="Photos (up to 3)" />
        </Card>

        <Card style={{ gap: 0 }}>
          <Button
            label={showMore ? 'Fewer details' : 'More property details (optional)'}
            variant="ghost"
            onPress={() => setShowMore((s) => !s)}
            icon={showMore ? <ChevronUp size={16} color={colors.accent} /> : <ChevronDown size={16} color={colors.accent} />}
          />
          {showMore ? (
            <View style={{ gap: spacing.s4, paddingTop: spacing.s3 }}>
              <Divider />
              <SelectField label="Residence status" options={RESIDENCE_STATUS_OPTIONS} value={residenceStatus} onChange={setResidenceStatus} />
              <SelectField label="Office status" options={OFFICE_STATUS_OPTIONS} value={officeStatus} onChange={setOfficeStatus} />
              <TextField label="Internal remarks" value={internalRemarks} onChangeText={setInternalRemarks} multiline />
            </View>
          ) : null}
        </Card>

        {formError ? <Text variant="caption" color="error">{formError}</Text> : null}
        <Button label="Submit visit" onPress={onSubmit} loading={submitting} />
      </View>
    </Screen>
  );
}
