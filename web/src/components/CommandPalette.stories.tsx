import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Settings, CreditCard, Palette, Sun } from 'lucide-react';
import CommandPalette from './CommandPalette';
import type { PaletteItem } from './CommandPaletteHelpers';

const items: PaletteItem[] = [
  { id: '1', label: 'Account settings', category: 'Profile', icon: Settings, run: () => {} },
  { id: '2', label: 'Billing & subscription', category: 'Billing', icon: CreditCard, run: () => {} },
  { id: '3', label: 'Customize topbar', category: 'Appearance', icon: Palette, run: () => {} },
  { id: '4', label: 'Toggle dark mode', category: 'Appearance', icon: Sun, run: () => {} },
];

const meta: Meta<typeof CommandPalette> = {
  title: 'Components/CommandPalette',
  component: CommandPalette,
  args: { open: true, onClose: fn(), items },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof CommandPalette>;

export const Open: Story = {};
export const Empty: Story = { args: { items: [] } };
