import type { Meta, StoryObj } from '@storybook/react-vite';
import ResetPasswordPage from './ResetPasswordPage';
import { withPageProviders } from './storyKit';

const meta: Meta<typeof ResetPasswordPage> = {
  title: 'Pages/Public/ResetPasswordPage',
  component: ResetPasswordPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof ResetPasswordPage>;
export const Default: Story = {};
