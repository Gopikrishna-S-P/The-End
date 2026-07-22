import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { NotifItem } from './NotifItem';
import type { Notification } from '../utils/notifications';

const base: Notification = {
  id: 'n1',
  type: 'assignment',
  title: 'New case assigned to you',
  body: 'Loan #RP-88213 has been assigned to you by Priya Menon.',
  createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
  read: false,
  to: '/app/allocations/RP-88213',
};

const meta: Meta<typeof NotifItem> = {
  title: 'Components/NotifItem',
  component: NotifItem,
  args: {
    notif: base,
    snoozeOpen: false,
    onToggleSnooze: fn(),
    onCloseSnooze: fn(),
    onClose: fn(),
    onNavigate: fn(),
  },
  decorators: [(Story) => <div style={{ width: 340, background: 'var(--bg-surface)' }}><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof NotifItem>;

export const Unread: Story = {};
export const Read: Story = { args: { notif: { ...base, read: true } } };
export const NoLink: Story = { args: { notif: { ...base, to: undefined } } };
export const SystemDeadline: Story = {
  args: {
    notif: {
      ...base, type: 'deadline', title: 'PTP due tomorrow',
      body: 'Promise-to-pay for RP-77102 is due tomorrow.', to: undefined,
    },
  },
};
