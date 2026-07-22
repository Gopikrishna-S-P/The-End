import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import ShortcutsDialog from './ShortcutsDialog';

const meta: Meta<typeof ShortcutsDialog> = {
  title: 'Components/ShortcutsDialog',
  component: ShortcutsDialog,
  args: { open: true, onClose: fn() },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof ShortcutsDialog>;

export const Open: Story = {};
