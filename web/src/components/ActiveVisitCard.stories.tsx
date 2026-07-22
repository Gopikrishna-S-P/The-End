import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { fn } from 'storybook/test';
import ActiveVisitCard from './ActiveVisitCard';
import type { VisitSession } from '../types';

// Pulls its data from GET /api/v1/visit-sessions/active — no props for the
// data itself, so each story mocks that endpoint via MSW. Note: mounting
// with an active (non-CLOSED) session also opens a real WebSocket for live
// location publishing, which will fail to connect in Storybook — harmless,
// but expect a console warning.
const baseSession: VisitSession = {
  id: 'vs-1',
  loanNumber: 'RP-88213',
  borrowerName: 'Anitha Suresh',
  status: 'STARTED',
  startedAt: new Date(Date.now() - 9 * 60_000).toISOString(),
  distanceMetres: 240,
} as VisitSession;

const withSession = (session: VisitSession | null) =>
  http.get('/api/v1/visit-sessions/active', () => HttpResponse.json({ success: true, data: session }));

const meta: Meta<typeof ActiveVisitCard> = {
  title: 'Components/ActiveVisitCard',
  component: ActiveVisitCard,
  args: { onClosed: fn() },
  decorators: [(Story) => <div style={{ width: 380 }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof ActiveVisitCard>;

export const Started: Story = {
  parameters: { msw: { handlers: [withSession(baseSession)] } },
};

export const Reached: Story = {
  parameters: {
    msw: { handlers: [withSession({ ...baseSession, status: 'REACHED', reachedAt: new Date().toISOString() })] },
  },
};

export const Waiting: Story = {
  parameters: {
    msw: {
      handlers: [withSession({
        ...baseSession, status: 'WAITING',
        reachedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
        waitingSince: new Date(Date.now() - 2 * 60_000).toISOString(),
      })],
    },
  },
};

export const NoActiveVisit: Story = {
  parameters: { msw: { handlers: [withSession(null)] } }, // component renders nothing
};
