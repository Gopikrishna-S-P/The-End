import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import NotificationPanel from './NotificationPanel';
import { notifications } from '../utils/notifications';

function Seeded() {
  useEffect(() => {
    notifications.add({ type: 'assignment', title: 'New case assigned', body: 'RP-88213 assigned to you.', to: '/x' });
    notifications.add({ type: 'deadline', title: 'PTP due tomorrow', body: 'RP-77102 promise is due tomorrow.' });
    notifications.add({ type: 'mention', title: 'Priya mentioned you', body: 'In a note on RP-90341.' });
  }, []);
  return <NotificationPanel onClose={fn()} onNavigate={fn()} />;
}

const meta: Meta<typeof NotificationPanel> = {
  title: 'Components/NotificationPanel',
  component: NotificationPanel,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof NotificationPanel>;

export const WithNotifications: Story = { render: () => <Seeded /> };
export const Empty: Story = { args: { onClose: fn(), onNavigate: fn() } };
