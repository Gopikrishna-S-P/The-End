import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import CollectionDepositModal from './CollectionDepositModal';

const meta: Meta<typeof CollectionDepositModal> = {
  title: 'Components/CollectionDepositModal',
  component: CollectionDepositModal,
  args: { collection: { amount: '₹12,000' }, onClose: fn() },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof CollectionDepositModal>;

export const Default: Story = {};
