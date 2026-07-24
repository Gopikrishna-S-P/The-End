import type { Meta, StoryObj } from '@storybook/react-vite';
import MessageTemplatesPage from './MessageTemplatesPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('ORG_ADMIN');

const meta: Meta<typeof MessageTemplatesPage> = {
  title: 'Pages/Organization/MessageTemplatesPage',
  component: MessageTemplatesPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof MessageTemplatesPage>;
export const Default: Story = {};
