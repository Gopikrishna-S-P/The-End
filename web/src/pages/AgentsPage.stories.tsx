import type { Meta, StoryObj } from '@storybook/react-vite';
import AgentsPage from './AgentsPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof AgentsPage> = {
  title: 'Pages/FieldOps/AgentsPage',
  component: AgentsPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof AgentsPage>;
export const Default: Story = {};
