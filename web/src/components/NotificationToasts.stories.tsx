import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import NotificationToasts from './NotificationToasts';
import { notifications } from '../utils/notifications';

function Fire() {
  useEffect(() => {
    notifications.add({
      type: 'assignment',
      title: 'New case assigned to you',
      body: 'Loan #RP-88213 has been assigned to you.',
      to: '/app/allocations/RP-88213',
    });
  }, []);
  return <NotificationToasts />;
}

const meta: Meta<typeof NotificationToasts> = {
  title: 'Components/NotificationToasts',
  component: NotificationToasts,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof NotificationToasts>;

export const Default: Story = { render: () => <Fire /> };
