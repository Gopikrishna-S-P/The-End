import type { Meta, StoryObj } from '@storybook/react-vite';
import PrivacyPolicyPage from './PrivacyPolicyPage';
import { withPageProviders } from './storyKit';

const meta: Meta<typeof PrivacyPolicyPage> = {
  title: 'Pages/Public/PrivacyPolicyPage',
  component: PrivacyPolicyPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof PrivacyPolicyPage>;
export const Default: Story = {};
