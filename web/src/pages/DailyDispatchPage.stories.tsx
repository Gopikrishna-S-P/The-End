import type { Meta, StoryObj } from '@storybook/react-vite';
import DailyDispatchPage from './DailyDispatchPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof DailyDispatchPage> = {
  title: 'Pages/FieldOps/DailyDispatchPage',
  component: DailyDispatchPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof DailyDispatchPage>;
export const Default: Story = {};
