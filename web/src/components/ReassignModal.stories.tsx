import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { fn } from 'storybook/test';
import ReassignModal from './ReassignModal';

const agents = [
  { id: 'a1', firstName: 'Ravi', lastName: 'Kumar' },
  { id: 'a2', firstName: 'Priya', lastName: 'Menon' },
  { id: 'a3', firstName: 'Arun', lastName: 'Sharma' },
];
const handler = http.get('/api/v1/users/by-role/FO', () => HttpResponse.json({ success: true, data: agents }));

const meta: Meta<typeof ReassignModal> = {
  title: 'Components/ReassignModal',
  component: ReassignModal,
  args: {
    allocationId: 'RP-88213', currentAgentName: 'Ravi Kumar',
    onClose: fn(), onSuccess: fn(),
  },
  parameters: { layout: 'fullscreen', msw: { handlers: [handler] } },
};
export default meta;

type Story = StoryObj<typeof ReassignModal>;

export const NoAssignmentEntity: Story = {}; // simple allocation-level reassign, no reason required

export const WithAssignmentEntity: Story = {
  args: { assignmentId: 'asgn-1' }, // requires assignment date + reason (min 10 chars)
};
