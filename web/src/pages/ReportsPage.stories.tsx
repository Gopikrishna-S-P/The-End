import type { Meta, StoryObj } from '@storybook/react-vite';
import ReportsPage from './ReportsPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof ReportsPage> = {
  title: 'Pages/Reports/ReportsPage',
  component: ReportsPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof ReportsPage>;
export const Default: Story = {};
