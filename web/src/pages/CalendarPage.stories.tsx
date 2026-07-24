import type { Meta, StoryObj } from '@storybook/react-vite';
import CalendarPage from './CalendarPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof CalendarPage> = {
  title: 'Pages/Organization/CalendarPage',
  component: CalendarPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof CalendarPage>;
export const Default: Story = {};
