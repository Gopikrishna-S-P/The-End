import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import FeedbackDialog from './FeedbackDialog';

const meta: Meta<typeof FeedbackDialog> = {
  title: 'Components/FeedbackDialog',
  component: FeedbackDialog,
  args: { open: true, onClose: fn(), userIdentifier: 'demo@recoverpro.in', onSubmit: fn() },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof FeedbackDialog>;

export const Default: Story = {};
