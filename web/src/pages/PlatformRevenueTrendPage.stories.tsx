import type { Meta, StoryObj } from '@storybook/react-vite';
import PlatformRevenueTrendPage from './PlatformRevenueTrendPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('PLATFORM_ADMIN');

const meta: Meta<typeof PlatformRevenueTrendPage> = {
  title: 'Pages/Platform/PlatformRevenueTrendPage',
  component: PlatformRevenueTrendPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof PlatformRevenueTrendPage>;
export const Default: Story = {};
