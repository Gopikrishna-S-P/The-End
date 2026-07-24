import type { Meta, StoryObj } from '@storybook/react-vite';
import PaymentLinksPage from './PaymentLinksPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('ORG_ADMIN');

const meta: Meta<typeof PaymentLinksPage> = {
  title: 'Pages/Collections/PaymentLinksPage',
  component: PaymentLinksPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof PaymentLinksPage>;
export const Default: Story = {};
