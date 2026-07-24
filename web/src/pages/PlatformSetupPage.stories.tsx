import type { Meta, StoryObj } from '@storybook/react-vite';
import PlatformSetupPage from './PlatformSetupPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('PLATFORM_ADMIN');

const meta: Meta<typeof PlatformSetupPage> = {
  title: 'Pages/Platform/PlatformSetupPage',
  component: PlatformSetupPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof PlatformSetupPage>;
export const Default: Story = {};
