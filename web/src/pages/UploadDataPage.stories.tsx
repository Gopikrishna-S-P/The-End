import type { Meta, StoryObj } from '@storybook/react-vite';
import UploadDataPage from './UploadDataPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof UploadDataPage> = {
  title: 'Pages/Uploads/UploadDataPage',
  component: UploadDataPage,
  decorators: [withPageProviders('/app/uploads/:id/data', '/app/uploads/story-upload-1/data')],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof UploadDataPage>;
export const Default: Story = {};
