import type { Meta, StoryObj } from '@storybook/react-vite';
import ForgotPasswordPage from './ForgotPasswordPage';
import { withPageProviders } from './storyKit';

const meta: Meta<typeof ForgotPasswordPage> = {
  title: 'Pages/Public/ForgotPasswordPage',
  component: ForgotPasswordPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof ForgotPasswordPage>;
export const Default: Story = {};
