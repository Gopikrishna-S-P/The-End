import { z } from 'zod';
import type { UserCreationRequest, RequestedRole, StaffRole } from '../api/userRequestsApi';
import { ShieldCheck, Users } from 'lucide-react';

export type Tab = 'pending' | 'mine';

export const STAFF_ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: 'FO',      label: 'Field Officer' },
  { value: 'CALLER',  label: 'Caller' },
  { value: 'TL',      label: 'Team Lead' },
  { value: 'MANAGER', label: 'Manager' },
];

export const submitSchema = z.object({
  email:     z.string().email('Enter a valid email'),
  firstName: z.string().min(1, 'Required'),
  lastName:  z.string().min(1, 'Required'),
  staffRole: z.enum(['FO', 'CALLER', 'TL', 'MANAGER'], { errorMap: () => ({ message: 'Select a role' }) }),
  notes:     z.string().optional(),
});
export type SubmitForm = z.infer<typeof submitSchema>;

export const STATUS_VARIANT: Record<UserCreationRequest['status'], string> = {
  PENDING:  'is-warn',
  APPROVED: 'is-accent',
  REJECTED: 'is-error',
};

export const StatusPill = ({ status }: { status: UserCreationRequest['status'] }) => (
  <span className={`ds-pill ${STATUS_VARIANT[status]}`}>
    {status.charAt(0) + status.slice(1).toLowerCase()}
  </span>
);

export const RoleBadge = ({ role, staffRole }: { role: RequestedRole; staffRole?: StaffRole }) => (
  <span className="ds-pill is-info">
    {role === 'ORG_ADMIN' ? <ShieldCheck size={10} /> : <Users size={10} />}
    {role === 'ORG_ADMIN'
      ? 'Org Admin'
      : STAFF_ROLE_OPTIONS.find(o => o.value === staffRole)?.label ?? 'Org User'}
  </span>
);
