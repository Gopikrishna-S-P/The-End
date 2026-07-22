import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import CaseTimeline from './CaseTimeline';

const handlers = [
  http.get('/api/v1/cases/:id/timeline', () => HttpResponse.json({
    success: true,
    data: {
      allocationId: 'RP-88213', organizationId: 'org-1', loanNumber: 'RP-88213', borrowerName: 'Anitha Suresh',
      currentStatus: 'ACTIVE',
      events: [
        { timestamp: new Date(Date.now() - 2 * 86400_000).toISOString(), eventType: 'ASSIGNMENT_CREATED', summary: 'Assigned to Ravi Kumar', actorRole: 'ORG_ADMIN', actorName: 'Gopikrishna S P', sourceTable: 'assignments', sourceId: 'a1' },
        { timestamp: new Date(Date.now() - 1 * 86400_000).toISOString(), eventType: 'PTP_CREATED', summary: 'Promise to pay created for ₹12,000', actorRole: 'FO', actorName: 'Ravi Kumar', sourceTable: 'ptps', sourceId: 'p1', data: { amount: 12000 } },
      ],
    },
  })),
  http.get('/api/v1/visit-logs/allocation/:id', () => HttpResponse.json({ success: true, data: [] })),
  http.get('/api/v1/ptps/allocation/:id', () => HttpResponse.json({ success: true, data: [] })),
];

const meta: Meta<typeof CaseTimeline> = {
  title: 'Components/CaseTimeline',
  component: CaseTimeline,
  args: { allocationId: 'RP-88213' },
  parameters: { msw: { handlers } },
};
export default meta;

type Story = StoryObj<typeof CaseTimeline>;

export const Default: Story = {};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/cases/:id/timeline', () => HttpResponse.json({ success: true, data: { events: [] } })),
        http.get('/api/v1/visit-logs/allocation/:id', () => HttpResponse.json({ success: true, data: [] })),
        http.get('/api/v1/ptps/allocation/:id', () => HttpResponse.json({ success: true, data: [] })),
      ],
    },
  },
};
