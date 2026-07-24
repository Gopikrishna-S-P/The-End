import type { Meta, StoryObj } from '@storybook/react-vite';
import MfaSetupPage from './MfaSetupPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('MANAGER');

const meta: Meta<typeof MfaSetupPage> = {
  title: 'Pages/Account/MfaSetupPage',
  component: MfaSetupPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof MfaSetupPage>;
export const Default: Story = {};
