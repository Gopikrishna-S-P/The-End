import type { Meta, StoryObj } from '@storybook/react-vite';
import UploadErrorsPage from './UploadErrorsPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof UploadErrorsPage> = {
  title: 'Pages/Uploads/UploadErrorsPage',
  component: UploadErrorsPage,
  decorators: [withPageProviders('/app/uploads/:id/errors', '/app/uploads/story-upload-1/errors')],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof UploadErrorsPage>;
export const Default: Story = {};
