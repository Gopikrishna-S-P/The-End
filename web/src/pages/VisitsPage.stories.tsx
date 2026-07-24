import type { Meta, StoryObj } from '@storybook/react-vite';
import VisitsPage from './VisitsPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof VisitsPage> = {
  title: 'Pages/FieldOps/VisitsPage',
  component: VisitsPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof VisitsPage>;
export const Default: Story = {};
