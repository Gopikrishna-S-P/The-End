import type { Meta, StoryObj } from '@storybook/react-vite';
import RoleManagementPage from './RoleManagementPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('ORG_ADMIN');

const meta: Meta<typeof RoleManagementPage> = {
  title: 'Pages/Organization/RoleManagementPage',
  component: RoleManagementPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof RoleManagementPage>;
export const Default: Story = {};
