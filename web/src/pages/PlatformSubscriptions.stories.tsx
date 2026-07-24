import type { Meta, StoryObj } from '@storybook/react-vite';
import PlatformSubscriptions from './PlatformSubscriptions';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('PLATFORM_ADMIN');

const meta: Meta<typeof PlatformSubscriptions> = {
  title: 'Pages/Platform/PlatformSubscriptions',
  component: PlatformSubscriptions,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof PlatformSubscriptions>;
export const Default: Story = {};
