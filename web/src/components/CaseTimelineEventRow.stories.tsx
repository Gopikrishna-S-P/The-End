import type { Meta, StoryObj } from '@storybook/react-vite';
import { EventRow } from './CaseTimelineEventRow';
import type { CaseEvent } from '../types';

const base: CaseEvent = {
  timestamp: new Date(Date.now() - 3 * 3600_000).toISOString(),
  eventType: 'PTP_CREATED',
  summary: 'Promise to pay created for ₹12,000',
  actorRole: 'FO',
  actorName: 'Ravi Kumar',
  sourceTable: 'ptps',
  sourceId: 'ptp-1',
  data: { amount: 12000, dueDate: '2026-08-01' },
  narrative: 'Borrower committed to paying the full overdue amount by month end.',
};

const meta: Meta<typeof EventRow> = {
  title: 'Components/CaseTimelineEventRow',
  component: EventRow,
  args: { ev: base },
  decorators: [(Story) => <ul style={{ listStyle: 'none', margin: 0, padding: 0, width: 420 }}><Story /></ul>],
};
export default meta;

type Story = StoryObj<typeof EventRow>;

export const WithDetails: Story = {};

export const SystemNoActor: Story = {
  args: {
    ev: {
      ...base, eventType: 'ALLOCATION_STATUS_CHANGED', actorRole: 'SYSTEM', actorName: undefined,
      summary: 'Status auto-changed to NPA after 90 days overdue', narrative: undefined,
      data: { previousStatus: 'OVERDUE', newStatus: 'NPA' },
    },
  },
};

export const NoExpandableDetails: Story = {
  args: {
    ev: {
      ...base, eventType: 'VISIT_LOGGED', summary: 'Field visit logged', data: undefined, narrative: undefined,
    },
  },
};
