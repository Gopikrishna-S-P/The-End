import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { fn } from 'storybook/test';
import UserMenu from './UserMenu';

function Interactive() {
  const [open, setOpen] = useState(true);
  return (
    <UserMenu
      user={{ firstName: 'Gopikrishna', lastName: 'S P', email: 'gopikrishna@recoverpro.in' }}
      roleLabel="Org Admin"
      avatarColor="#0AA550"
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      onLogout={fn()}
    />
  );
}

const meta: Meta<typeof UserMenu> = {
  title: 'Components/UserMenu',
  component: UserMenu,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
};
export default meta;

type Story = StoryObj<typeof UserMenu>;

export const Open: Story = { render: () => <Interactive /> };

export const LogoutConfirm: Story = {
  args: {
    user: { firstName: 'Gopikrishna', lastName: 'S P', email: 'gopikrishna@recoverpro.in' },
    roleLabel: 'Org Admin', avatarColor: '#0AA550', open: true,
    onOpen: fn(), onClose: fn(), onLogout: fn(),
    logoutConfirm: true, onLogoutConfirmCancel: fn(),
  },
};
