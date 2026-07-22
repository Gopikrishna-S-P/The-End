import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import UsersPermissionsModal from './UsersPermissionsModal';

const meta: Meta<typeof UsersPermissionsModal> = {
  title: 'Components/UsersPermissionsModal',
  component: UsersPermissionsModal,
  args: { user: { firstName: 'Ravi' }, onClose: fn() },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof UsersPermissionsModal>;

export const Default: Story = {};
