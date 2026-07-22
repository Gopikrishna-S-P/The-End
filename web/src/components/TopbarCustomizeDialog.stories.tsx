import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import TopbarCustomizeDialog from './TopbarCustomizeDialog';

const meta: Meta<typeof TopbarCustomizeDialog> = {
  title: 'Components/TopbarCustomizeDialog',
  component: TopbarCustomizeDialog,
  args: { open: true, onClose: fn() },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof TopbarCustomizeDialog>;

export const Open: Story = {};
