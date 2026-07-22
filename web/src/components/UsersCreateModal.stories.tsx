import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import UsersCreateModal from './UsersCreateModal';

const meta: Meta<typeof UsersCreateModal> = {
  title: 'Components/UsersCreateModal',
  component: UsersCreateModal,
  args: { onClose: fn() },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof UsersCreateModal>;

export const Default: Story = {};
