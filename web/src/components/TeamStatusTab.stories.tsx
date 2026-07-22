import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import TeamStatusTab from './TeamStatusTab';

const team = [
  { agentId: 'a1', agentName: 'Ravi Kumar', activeStatus: 'WAITING', activeLoanNumber: 'RP-88213', activeBorrowerName: 'Anitha Suresh', statusSince: new Date(Date.now() - 18 * 60_000).toISOString(), totalDistanceMetres: 4200 },
  { agentId: 'a2', agentName: 'Priya Menon', activeStatus: 'REACHED', activeLoanNumber: 'RP-77102', activeBorrowerName: 'Suresh Babu', statusSince: new Date(Date.now() - 6 * 60_000).toISOString(), totalDistanceMetres: 7600 },
  { agentId: 'a3', agentName: 'Arun Sharma', activeStatus: null, activeLoanNumber: null, activeBorrowerName: null, statusSince: null, totalDistanceMetres: 2100 },
];
const distance = team.map(t => ({ agentId: t.agentId, agentName: t.agentName, totalDistanceMetres: t.totalDistanceMetres, sessionCount: 3 }));

const handlers = [
  http.get('/api/v1/visit-sessions/team-status', () => HttpResponse.json({ success: true, data: team })),
  http.get('/api/v1/visit-sessions/distance-summary', () => HttpResponse.json({ success: true, data: distance })),
];

const meta: Meta<typeof TeamStatusTab> = {
  title: 'Components/TeamStatusTab',
  component: TeamStatusTab,
  parameters: { msw: { handlers } },
};
export default meta;

type Story = StoryObj<typeof TeamStatusTab>;

export const Default: Story = {};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/visit-sessions/team-status', () => HttpResponse.json({ success: true, data: [] })),
        http.get('/api/v1/visit-sessions/distance-summary', () => HttpResponse.json({ success: true, data: [] })),
      ],
    },
  },
};
