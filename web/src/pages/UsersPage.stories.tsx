import type { Meta, StoryObj } from '@storybook/react-vite';
import UsersPage from './UsersPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('ORG_ADMIN');

const meta: Meta<typeof UsersPage> = {
  title: 'Pages/Organization/UsersPage',
  component: UsersPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof UsersPage>;
export const Default: Story = {};
