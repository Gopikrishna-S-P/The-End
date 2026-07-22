import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { FeatureGate } from './FeatureGate';
import { AuthProvider } from '../AuthContext';
import { FeatureFlagsProvider } from '../contexts/FeatureFlagsContext';
import { setAccessToken, setRefreshToken, setUserCache } from '../api/axiosInstance';

const FAKE_USER = {
  id: 'story-user-3', email: 'demo@recoverpro.in', firstName: 'Demo', lastName: 'User',
  enabled: true, accountLocked: false, mfaEnabled: true, organizationId: 'story-org-1',
  createdAt: new Date().toISOString(),
  roles: [{ id: 'r1', name: 'ROLE_ORG_ADMIN', description: '', organizationId: 'story-org-1', organizationName: null, systemRole: false, permissions: [] }],
};
setAccessToken('storybook-fake-access-token');
setRefreshToken('storybook-fake-refresh-token');
setUserCache(FAKE_USER);

const meHandler = http.get('/api/v1/auth/me', () => HttpResponse.json({ success: true, data: FAKE_USER }));
const flagsHandler = (flags: unknown[]) =>
  http.get('/api/v1/feature-flags', () => HttpResponse.json({ success: true, data: flags }));

const meta: Meta<typeof FeatureGate> = {
  title: 'Components/FeatureGate',
  component: FeatureGate,
  args: {
    flagKey: 'LUCIEN_AI',
    children: (
      <div style={{ padding: 24, background: 'var(--bg-subtle)', borderRadius: 12, width: 320 }}>
        Lucien AI assistant panel would render here.
      </div>
    ),
  },
  decorators: [(Story) => (
    <MemoryRouter>
      <AuthProvider>
        <FeatureFlagsProvider><Story /></FeatureFlagsProvider>
      </AuthProvider>
    </MemoryRouter>
  )],
  parameters: { msw: { handlers: [meHandler] } },
};
export default meta;

type Story = StoryObj<typeof FeatureGate>;

export const Locked: Story = {
  parameters: { msw: { handlers: [meHandler, flagsHandler([])] } },
};

export const Unlocked: Story = {
  parameters: {
    msw: { handlers: [meHandler, flagsHandler([{ flagKey: 'LUCIEN_AI', enabled: true }])] },
  },
};

export const HardBlock: Story = {
  args: { hardBlock: true },
  parameters: { msw: { handlers: [meHandler, flagsHandler([])] } },
};
