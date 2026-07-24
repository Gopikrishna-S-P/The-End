import type { Meta, StoryObj } from '@storybook/react-vite';
import RagDocumentsPage from './RagDocumentsPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('PLATFORM_ADMIN');

const meta: Meta<typeof RagDocumentsPage> = {
  title: 'Pages/Lucien/RagDocumentsPage',
  component: RagDocumentsPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof RagDocumentsPage>;
export const Default: Story = {};
