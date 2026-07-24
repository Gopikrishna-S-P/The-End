import type { Meta, StoryObj } from '@storybook/react-vite';
import NotificationsPage from './NotificationsPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof NotificationsPage> = {
  title: 'Pages/Organization/NotificationsPage',
  component: NotificationsPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof NotificationsPage>;
export const Default: Story = {};
