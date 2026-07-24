import type { Meta, StoryObj } from '@storybook/react-vite';
import LiveTrackPage from './LiveTrackPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof LiveTrackPage> = {
  title: 'Pages/FieldOps/LiveTrackPage',
  component: LiveTrackPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof LiveTrackPage>;
export const Default: Story = {};
