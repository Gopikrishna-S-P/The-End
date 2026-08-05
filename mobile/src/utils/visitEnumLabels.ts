import type { SelectOption } from '@/components/ui/SelectField';
import type {
  ClassificationCode, Contactability, Disp, OfficeStatus, ReasonForDefault, ResidenceStatus,
} from '@/types/domain';
import type { PaymentMode } from '@/types/core';

export const DISP_OPTIONS: SelectOption<Disp>[] = [
  { value: 'PAID', label: 'Paid in full' },
  { value: 'PTP', label: 'Promise to pay' },
  { value: 'FOLLOW_UP', label: 'Follow-up needed' },
  { value: 'RTP', label: 'Refused to pay' },
  { value: 'NC_SKIP', label: 'Non-contactable / skip' },
];

export const CONTACTABILITY_OPTIONS: SelectOption<Contactability>[] = [
  { value: 'CONTACTED_AT_RESIDENCE', label: 'Contacted at residence' },
  { value: 'CONTACTED_AT_OFFICE', label: 'Contacted at office' },
  { value: 'CONTACTABLE_AT_BOTH_PLACES', label: 'Contactable at both places' },
  { value: 'CONTACTABLE_ON_PHONE_ONLY', label: 'Contactable on phone only' },
  { value: 'NON_CONTACTABLE', label: 'Non-contactable' },
];

export const PAYMENT_MODE_OPTIONS: SelectOption<PaymentMode>[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'NEFT', label: 'NEFT' },
  { value: 'RTGS', label: 'RTGS' },
];

export const REASON_FOR_DEFAULT_OPTIONS: SelectOption<ReasonForDefault>[] = [
  { value: 'TEMPORARY_FINANCIAL_PROBLEM', label: 'Temporary financial problem' },
  { value: 'BUSINESS_SLOW_DOWN', label: 'Business slow down' },
  { value: 'BUSINESS_CLOSED', label: 'Business closed' },
  { value: 'CUSTOMER_ABSCONDING', label: 'Customer absconding' },
  { value: 'CUSTOMER_ABSCONDING_NC_SKIP', label: 'Absconding (non-contactable)' },
  { value: 'INTENTIONAL_DEFAULTER', label: 'Intentional defaulter' },
];

export const CLASSIFICATION_CODE_OPTIONS: SelectOption<ClassificationCode>[] = [
  { value: 'WORKABLE_1_INHOUSE_FIELD', label: 'Workable — in-house field' },
  { value: 'WORKABLE_3_HARD_ACCOUNTS_LEGAL_AGGRESSIVE', label: 'Workable — hard / legal action' },
  { value: 'NON_WORKABLE_NC_SKIP', label: 'Non-workable — skip' },
];

export const RESIDENCE_STATUS_OPTIONS: SelectOption<ResidenceStatus>[] = [
  { value: 'AVAILABLE_AND_RESIDING', label: 'Available and residing' },
  { value: 'RESIDING', label: 'Residing' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ONLY_FAMILY_MEMBERS_RESIDING', label: 'Only family members residing' },
  { value: 'LOCKED', label: 'Locked' },
  { value: 'SHIFTED_NEW_ADDRESS_NOT_AVAILABLE', label: 'Shifted — new address not available' },
  { value: 'ADDRESS_NOT_TRACED', label: 'Address not traced' },
];

export const OFFICE_STATUS_OPTIONS: SelectOption<OfficeStatus>[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ACTIVE_BUSINESS_SAME_PLACE', label: 'Active business, same place' },
  { value: 'BUSINESS_RUNNING_SAME_PLACE', label: 'Business running, same place' },
  { value: 'BUSINESS_CLOSED', label: 'Business closed' },
  { value: 'ADDRESS_NOT_TRACED', label: 'Address not traced' },
];
