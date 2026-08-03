import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const ROLE_REDIRECT: Record<string, string> = {
  ROLE_PLATFORM_ADMIN: '/platform/dashboard',
  ROLE_ORG_ADMIN:      '/app/dashboard',
  ROLE_MANAGER:        '/app/dashboard',
  ROLE_TL:             '/app/dashboard',
  ROLE_FO:             '/app/today',
  ROLE_CALLER:         '/app/today',
  ROLE_TRACER:         '/app/today',
};
