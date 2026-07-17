import { z } from 'zod';
import type { Role as AppRole } from '../types';

export type Role = AppRole;

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  mfaEnabled: boolean;
  phone?: string;
  agency?: string;
  createdAt?: string;
  avatarUrl?: string;
}

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[@$!%*?&]/, 'Must contain a special character (@$!%*?&)'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const ROLE_LABELS: Record<Role, string> = {
  PLATFORM_ADMIN: 'Platform Admin',
  ORG_ADMIN:      'Org Admin',
  MANAGER:        'Manager',
  TL:             'Team Lead',
  FO:             'Field Officer',
  CALLER:         'Caller',
  TRACER:         'Tracer',
  FIELD_AGENT:    'Field Agent',
  AGENCY_ADMIN:   'Agency Admin',
  BANK_ADMIN:     'Bank Admin',
};

export const ROLE_PILL_CLASS: Record<Role, string> = {
  PLATFORM_ADMIN: 'profile-pill-platform',
  ORG_ADMIN:      'profile-pill-org',
  MANAGER:        'profile-pill-manager',
  TL:             'profile-pill-tl',
  FO:             'profile-pill-fo',
  CALLER:         'profile-pill-caller',
  TRACER:         'profile-pill-tracer',
  FIELD_AGENT:    'profile-pill-fo',
  AGENCY_ADMIN:   'profile-pill-org',
  BANK_ADMIN:     'profile-pill-manager',
};

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
