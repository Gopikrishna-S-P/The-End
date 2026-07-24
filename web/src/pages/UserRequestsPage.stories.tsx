import type { Meta, StoryObj } from '@storybook/react-vite';
import UserRequestsPage from './UserRequestsPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('ORG_ADMIN');

const meta: Meta<typeof UserRequestsPage> = {
  title: 'Pages/Organization/UserRequestsPage',
  component: UserRequestsPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof UserRequestsPage>;
export const Default: Story = {};
