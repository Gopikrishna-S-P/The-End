import type { Meta, StoryObj } from '@storybook/react-vite';
import ReconciliationPage from './ReconciliationPage';
import { seedAuth, withPageProviders } from './storyKit';

seedAuth('ORG_ADMIN');

const meta: Meta<typeof ReconciliationPage> = {
  title: 'Pages/Collections/ReconciliationPage',
  component: ReconciliationPage,
  decorators: [withPageProviders()],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof ReconciliationPage>;
export const Default: Story = {};
