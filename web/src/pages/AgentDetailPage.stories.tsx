import type { Meta, StoryObj } from '@storybook/react-vite';
import AgentDetailPage from './AgentDetailPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof AgentDetailPage> = {
  title: 'Pages/FieldOps/AgentDetailPage',
  component: AgentDetailPage,
  decorators: [withPageProviders('/app/agents/:id', '/app/agents/story-agent-1')],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof AgentDetailPage>;
export const Default: Story = {};
