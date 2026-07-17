import { z } from 'zod';
import type { UserCreationRequest, RequestedRole } from '../api/userRequestsApi';
import { ShieldCheck, Users } from 'lucide-react';

export type Tab = 'pending' | 'mine';

export const submitSchema = z.object({
  email:     z.string().email('Enter a valid email'),
  firstName: z.string().min(1, 'Required'),
  lastName:  z.string().min(1, 'Required'),
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

export const RoleBadge = ({ role }: { role: RequestedRole }) => (
  <span className="ds-pill is-info">
    {role === 'ORG_ADMIN' ? <ShieldCheck size={10} /> : <Users size={10} />}
    {role === 'ORG_ADMIN' ? 'Org Admin' : 'Org User'}
  </span>
);
