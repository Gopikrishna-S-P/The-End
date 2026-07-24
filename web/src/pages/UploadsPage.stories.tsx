import type { Meta, StoryObj } from '@storybook/react-vite';
import UploadsPage from './UploadsPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof UploadsPage> = {
  title: 'Pages/Uploads/UploadsPage',
  component: UploadsPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof UploadsPage>;
export const Default: Story = {};
