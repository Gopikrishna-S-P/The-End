import type { Meta, StoryObj } from '@storybook/react-vite';
import Dashboard from './Dashboard';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof Dashboard> = {
  title: 'Pages/Dashboards/Dashboard',
  component: Dashboard,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof Dashboard>;
export const Default: Story = {};
