import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { fn } from 'storybook/test';
import LucienPanel from './LucienPanel';
import { AuthProvider } from '../AuthContext';
import { setAccessToken, setRefreshToken, setUserCache } from '../api/axiosInstance';

// Opening the panel auto-starts a chat session (POST /api/v1/lucien/sessions)
// via useAuth()'s agentId — seed a fake session + mock that endpoint.
const FAKE_USER = {
  id: 'agent-1', email: 'ravi.kumar@recoverpro.in', firstName: 'Ravi', lastName: 'Kumar',
  enabled: true, accountLocked: false, mfaEnabled: true, organizationId: 'story-org-1',
  createdAt: new Date().toISOString(),
  roles: [{ id: 'r1', name: 'ROLE_FO', description: '', organizationId: 'story-org-1', organizationName: null, systemRole: false, permissions: [] }],
};
setAccessToken('storybook-fake-access-token');
setRefreshToken('storybook-fake-refresh-token');
setUserCache(FAKE_USER);

const handlers = [
  http.get('/api/v1/auth/me', () => HttpResponse.json({ success: true, data: FAKE_USER })),
  http.post('/api/v1/lucien/sessions', () => HttpResponse.json({
    success: true,
    data: { sessionId: 'session-1', agentId: 'agent-1', agentFirstName: 'Ravi', active: true, totalMessages: 0, createdAt: new Date().toISOString() },
  })),
];

const meta: Meta<typeof LucienPanel> = {
  title: 'Components/LucienPanel',
  component: LucienPanel,
  args: { open: true, onClose: fn() },
  decorators: [(Story) => <AuthProvider><Story /></AuthProvider>],
  parameters: { layout: 'fullscreen', msw: { handlers } },
};
export default meta;

type Story = StoryObj<typeof LucienPanel>;

export const Open: Story = {};
