import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import MfaNudge from './MfaNudge';
import { AuthProvider } from '../AuthContext';
import { setAccessToken, setRefreshToken, setUserCache } from '../api/axiosInstance';

// Same seeding approach as SubscriptionBanner.stories.tsx — real AuthProvider,
// fake cached session with mfaEnabled: false so the nudge actually shows.
const FAKE_USER = {
  id: 'story-user-2', email: 'demo@recoverpro.in', firstName: 'Demo', lastName: 'User',
  enabled: true, accountLocked: false, mfaEnabled: false, organizationId: 'story-org-1',
  createdAt: new Date().toISOString(),
  roles: [{ id: 'r1', name: 'ROLE_ORG_ADMIN', description: '', organizationId: 'story-org-1', organizationName: null, systemRole: false, permissions: [] }],
};

setAccessToken('storybook-fake-access-token');
setRefreshToken('storybook-fake-refresh-token');
setUserCache(FAKE_USER);
try { localStorage.removeItem('rp-mfa-nudge-snoozed-until'); } catch {}

const meHandler = http.get('/api/v1/auth/me', () => HttpResponse.json({ success: true, data: FAKE_USER }));

const meta: Meta<typeof MfaNudge> = {
  title: 'Components/MfaNudge',
  component: MfaNudge,
  decorators: [(Story) => <MemoryRouter><AuthProvider><Story /></AuthProvider></MemoryRouter>],
  parameters: { layout: 'fullscreen', msw: { handlers: [meHandler] } },
};
export default meta;

type Story = StoryObj<typeof MfaNudge>;

export const Default: Story = {};
