import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import LoansPage from './LoansPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const FAKE_ALLOCATIONS = Array.from({ length: 8 }, (_, i) => ({
  id: `alloc-${i + 1}`,
  borrowerName: `Borrower ${i + 1}`,
  borrowerPhone: `98765${(43210 + i).toString().padStart(5, '0')}`,
  loanAccountNumber: `LN-2026-${1000 + i}`,
  principalAmount: 250000 + i * 15000,
  outstandingAmount: 187500 + i * 10000,
  emiAmount: 8200 + i * 100,
  dpdDays: i * 12,
  status: i % 3 === 0 ? 'UNASSIGNED' : 'ASSIGNED',
  assignedAgentName: i % 3 === 0 ? null : `Agent ${i}`,
  organizationId: 'story-org-1',
  createdAt: new Date().toISOString(),
}));

const handlers = [
  http.get('/api/v1/allocations', () => HttpResponse.json({
    success: true,
    data: { content: FAKE_ALLOCATIONS, page: 0, size: 20, totalElements: FAKE_ALLOCATIONS.length, totalPages: 1, last: true },
  })),
];

const meta: Meta<typeof LoansPage> = {
  title: 'Pages/Loans/LoansPage',
  component: LoansPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen', msw: { handlers } },
};
export default meta;

type Story = StoryObj<typeof LoansPage>;
export const Default: Story = {};
