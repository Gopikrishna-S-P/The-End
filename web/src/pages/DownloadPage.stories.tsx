import type { Meta, StoryObj } from '@storybook/react-vite';
import DownloadPage from './DownloadPage';
import { withPageProviders } from './storyKit';

const meta: Meta<typeof DownloadPage> = {
  title: 'Pages/Public/DownloadPage',
  component: DownloadPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof DownloadPage>;
export const Default: Story = {};
