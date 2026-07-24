import type { Meta, StoryObj } from '@storybook/react-vite';
import LoginPage from './LoginPage';
import { withPageProviders } from './storyKit';

const meta: Meta<typeof LoginPage> = {
  title: 'Pages/Public/LoginPage',
  component: LoginPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof LoginPage>;
export const Default: Story = {};
