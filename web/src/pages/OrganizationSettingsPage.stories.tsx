import type { Meta, StoryObj } from '@storybook/react-vite';
import OrganizationSettingsPage from './OrganizationSettingsPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('ORG_ADMIN');

const meta: Meta<typeof OrganizationSettingsPage> = {
  title: 'Pages/Organization/OrganizationSettingsPage',
  component: OrganizationSettingsPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof OrganizationSettingsPage>;
export const Default: Story = {};
