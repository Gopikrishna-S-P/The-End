import type { Meta, StoryObj } from '@storybook/react-vite';
import LandingPage from './LandingPage';
import { withPageProviders } from './pages/storyKit';

const meta: Meta<typeof LandingPage> = {
  title: 'Pages/Public/LandingPage',
  component: LandingPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof LandingPage>;
export const Default: Story = {};
