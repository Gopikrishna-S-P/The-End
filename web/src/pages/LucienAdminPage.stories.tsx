import type { Meta, StoryObj } from '@storybook/react-vite';
import LucienAdminPage from './LucienAdminPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('PLATFORM_ADMIN');

const meta: Meta<typeof LucienAdminPage> = {
  title: 'Pages/Lucien/LucienAdminPage',
  component: LucienAdminPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof LucienAdminPage>;
export const Default: Story = {};
