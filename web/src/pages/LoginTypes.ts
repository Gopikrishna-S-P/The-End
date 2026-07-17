import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const ROLE_REDIRECT: Record<string, string> = {
  PLATFORM_ADMIN: '/platform/dashboard',
  ORG_ADMIN:      '/app/dashboard',
  MANAGER:        '/app/dashboard',
  TL:             '/app/dashboard',
  FO:             '/app/today',
  CALLER:         '/app/today',
  TRACER:         '/app/today',
  AGENCY_ADMIN:   '/app/dashboard',
  BANK_ADMIN:     '/app/dashboard',
  FIELD_AGENT:    '/app/today',
};
