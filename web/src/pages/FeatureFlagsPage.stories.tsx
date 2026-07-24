import type { Meta, StoryObj } from '@storybook/react-vite';
import FeatureFlagsPage from './FeatureFlagsPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('PLATFORM_ADMIN');

const meta: Meta<typeof FeatureFlagsPage> = {
  title: 'Pages/Platform/FeatureFlagsPage',
  component: FeatureFlagsPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof FeatureFlagsPage>;
export const Default: Story = {};
