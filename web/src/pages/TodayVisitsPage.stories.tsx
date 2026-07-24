import type { Meta, StoryObj } from '@storybook/react-vite';
import TodayVisitsPage from './TodayVisitsPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('FO');

const meta: Meta<typeof TodayVisitsPage> = {
  title: 'Pages/FieldOps/TodayVisitsPage',
  component: TodayVisitsPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof TodayVisitsPage>;
export const Default: Story = {};
