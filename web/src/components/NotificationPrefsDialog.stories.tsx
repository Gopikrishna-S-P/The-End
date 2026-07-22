import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import NotificationPrefsDialog from './NotificationPrefsDialog';

const meta: Meta<typeof NotificationPrefsDialog> = {
  title: 'Components/NotificationPrefsDialog',
  component: NotificationPrefsDialog,
  args: { onClose: fn() },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof NotificationPrefsDialog>;

export const Default: Story = {};
