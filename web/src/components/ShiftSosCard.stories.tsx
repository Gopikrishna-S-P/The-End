import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import ShiftSosCard from './ShiftSosCard';
import { AuthProvider } from '../AuthContext';
import { setAccessToken, setRefreshToken, setUserCache } from '../api/axiosInstance';

const FAKE_USER = {
  id: 'agent-1', email: 'ravi.kumar@recoverpro.in', firstName: 'Ravi', lastName: 'Kumar',
  enabled: true, accountLocked: false, mfaEnabled: true, organizationId: 'story-org-1',
  createdAt: new Date().toISOString(),
  roles: [{ id: 'r1', name: 'ROLE_FO', description: '', organizationId: 'story-org-1', organizationName: null, systemRole: false, permissions: [] }],
};
setAccessToken('storybook-fake-access-token');
setRefreshToken('storybook-fake-refresh-token');
setUserCache(FAKE_USER);
const meHandler = http.get('/api/v1/auth/me', () => HttpResponse.json({ success: true, data: FAKE_USER }));

const shiftHandler = (shift: unknown) =>
  http.get('/api/v1/agent/shifts/current', () => HttpResponse.json({ success: true, data: shift }));

const meta: Meta<typeof ShiftSosCard> = {
  title: 'Components/ShiftSosCard',
  component: ShiftSosCard,
  decorators: [(Story) => <MemoryRouter><AuthProvider><div style={{ width: 420 }}><Story /></div></AuthProvider></MemoryRouter>],
  parameters: { msw: { handlers: [meHandler] } },
};
export default meta;

type Story = StoryObj<typeof ShiftSosCard>;

export const OffDuty: Story = {
  parameters: { msw: { handlers: [meHandler, shiftHandler(null)] } },
};

export const OnDuty: Story = {
  parameters: {
    msw: {
      handlers: [meHandler, shiftHandler({
        id: 'shift-1', agentId: 'agent-1', status: 'ACTIVE',
        startedAt: new Date(Date.now() - 95 * 60_000).toISOString(),
      })],
    },
  },
};
