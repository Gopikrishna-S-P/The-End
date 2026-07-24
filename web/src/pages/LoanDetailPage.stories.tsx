import type { Meta, StoryObj } from '@storybook/react-vite';
import LoanDetailPage from './LoanDetailPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof LoanDetailPage> = {
  title: 'Pages/Loans/LoanDetailPage',
  component: LoanDetailPage,
  decorators: [withPageProviders('/app/allocations/:id', '/app/allocations/story-loan-1')],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof LoanDetailPage>;
export const Default: Story = {};
