import type { Meta, StoryObj } from '@storybook/react-vite';
import SubscriptionPage from './SubscriptionPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('ORG_ADMIN');

const meta: Meta<typeof SubscriptionPage> = {
  title: 'Pages/Organization/SubscriptionPage',
  component: SubscriptionPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof SubscriptionPage>;
export const Default: Story = {};
