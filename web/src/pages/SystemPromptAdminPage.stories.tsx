import type { Meta, StoryObj } from '@storybook/react-vite';
import SystemPromptAdminPage from './SystemPromptAdminPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('PLATFORM_ADMIN');

const meta: Meta<typeof SystemPromptAdminPage> = {
  title: 'Pages/Lucien/SystemPromptAdminPage',
  component: SystemPromptAdminPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof SystemPromptAdminPage>;
export const Default: Story = {};
