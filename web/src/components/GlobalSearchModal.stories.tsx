import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import GlobalSearchModal from './GlobalSearchModal';

const meta: Meta<typeof GlobalSearchModal> = {
  title: 'Components/GlobalSearchModal',
  component: GlobalSearchModal,
  args: { open: true, onClose: fn() },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof GlobalSearchModal>;

export const Open: Story = {};
