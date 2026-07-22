import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import PtpCreateModal from './PtpCreateModal';

const meta: Meta<typeof PtpCreateModal> = {
  title: 'Components/PtpCreateModal',
  component: PtpCreateModal,
  args: { onClose: fn() },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof PtpCreateModal>;

export const Blank: Story = {};
export const Prefilled: Story = {
  args: { defaultValues: { allocationId: 'RP-88213', borrowerName: 'Anitha Suresh', loanAccountNo: 'RP-88213' } },
};
