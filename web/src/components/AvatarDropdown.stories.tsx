import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import AvatarDropdown from './AvatarDropdown';

function Interactive() {
  const [open, setOpen] = useState(true);
  return (
    <AvatarDropdown
      user={{ firstName: 'Gopikrishna', lastName: 'S P', email: 'gopikrishna@recoverpro.in' }}
      roleLabel="Org Admin"
      avatarColor="#0AA550"
      open={open}
      onToggle={() => setOpen(o => !o)}
      onClose={() => setOpen(false)}
    />
  );
}

const meta: Meta<typeof AvatarDropdown> = {
  title: 'Components/AvatarDropdown',
  component: AvatarDropdown,
};
export default meta;

type Story = StoryObj<typeof AvatarDropdown>;

export const Open: Story = { render: () => <Interactive /> };
